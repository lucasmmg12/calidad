import { supabase } from '../utils/supabase';

export interface ChatMessage {
    id: string;
    phone_number: string;
    direction: 'incoming' | 'outgoing';
    message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
    body: string | null;
    media_url: string | null;
    media_mime_type: string | null;
    attachment_filename: string | null;
    sender_name: string | null;
    contact_name: string | null;
    report_tracking_id: string | null;
    is_read: boolean;
    created_at: string;
    metadata: any;
}

export interface ChatShortcut {
    id: string;
    shortcut_key: string;
    title: string;
    content: string;
    category: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

/** Fetch chat messages for a phone number, ordered by time */
export const fetchMessages = async (phoneNumber: string): Promise<ChatMessage[]> => {
    const normalized = phoneNumber.replace(/^549/, '').replace(/\D/g, '');
    const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('phone_number', normalized)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Chat] Error fetching messages:', error);
        return [];
    }
    return data || [];
};

/** Mark all messages from a phone as read */
export const markAsRead = async (phoneNumber: string): Promise<void> => {
    const normalized = phoneNumber.replace(/^549/, '').replace(/\D/g, '');
    await supabase
        .from('whatsapp_messages')
        .update({ is_read: true })
        .eq('phone_number', normalized)
        .eq('direction', 'incoming')
        .eq('is_read', false);
};

/** Send a text message via the send-whatsapp Edge Function and save it locally */
export const sendTextMessage = async (
    phoneNumber: string,
    message: string,
    senderName?: string,
    mediaUrl?: string,
): Promise<ChatMessage | null> => {
    const normalized = phoneNumber.replace(/^549/, '').replace(/\D/g, '');
    const botNumber = `549${normalized}`;

    // 1. Optimistic insert — save outgoing message locally FIRST so the user sees it immediately
    const msgType = mediaUrl ? 'image' : 'text';
    const { data: localMsg, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
            phone_number: normalized,
            direction: 'outgoing',
            message_type: msgType,
            body: message || null,
            media_url: mediaUrl || null,
            sender_name: senderName || 'Calidad',
            is_read: true,
        })
        .select()
        .single();

    if (insertError) {
        console.error('[Chat] Insert error:', insertError);
    }

    // 2. Send via BuilderBot (non-blocking — message is already visible)
    try {
        const { data: responseData, error: sendError } = await supabase.functions.invoke('send-whatsapp', {
            body: {
                number: botNumber,
                message,
                mediaUrl: mediaUrl || '',
            },
        });

        if (sendError) {
            console.warn('[Chat] Send via BuilderBot failed (message saved locally):', sendError.message || sendError);
            // Try to read the response body for more info
            if (responseData) {
                console.warn('[Chat] Response data:', responseData);
            }
        } else {
            console.log('[Chat] Message sent successfully via BuilderBot');
        }
    } catch (err) {
        console.warn('[Chat] Send error (non-fatal, message saved locally):', err);
    }

    return localMsg || null;
};

/** Upload media to Supabase Storage and get public URL */
export const uploadMedia = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

    const { error } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, file);

    if (error) {
        console.error('[Chat] Upload error:', error);
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(fileName);

    return urlData.publicUrl;
};

/** Fetch all shortcuts */
export const fetchShortcuts = async (): Promise<ChatShortcut[]> => {
    const { data, error } = await supabase
        .from('whatsapp_shortcuts')
        .select('*')
        .order('shortcut_key', { ascending: true });

    if (error) {
        console.error('[Chat] Shortcuts error:', error);
        return [];
    }
    return data || [];
};

/** Create a shortcut */
export const createShortcut = async (
    shortcutKey: string,
    title: string,
    content: string,
    category: string = 'general',
): Promise<ChatShortcut | null> => {
    const { data, error } = await supabase
        .from('whatsapp_shortcuts')
        .insert({ shortcut_key: shortcutKey, title, content, category })
        .select()
        .single();

    if (error) {
        console.error('[Chat] Create shortcut error:', error);
        return null;
    }
    return data;
};

/** Update a shortcut */
export const updateShortcut = async (
    id: string,
    updates: Partial<Pick<ChatShortcut, 'shortcut_key' | 'title' | 'content' | 'category'>>,
): Promise<void> => {
    await supabase
        .from('whatsapp_shortcuts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
};

/** Delete a shortcut */
export const deleteShortcut = async (id: string): Promise<void> => {
    await supabase
        .from('whatsapp_shortcuts')
        .delete()
        .eq('id', id);
};

/** Subscribe to realtime messages for a phone number */
export const subscribeToMessages = (
    phoneNumber: string,
    callback: (msg: ChatMessage) => void,
) => {
    const normalized = phoneNumber.replace(/^549/, '').replace(/\D/g, '');
    const channel = supabase
        .channel(`chat-${normalized}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages',
                filter: `phone_number=eq.${normalized}`,
            },
            (payload) => {
                callback(payload.new as ChatMessage);
            },
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
