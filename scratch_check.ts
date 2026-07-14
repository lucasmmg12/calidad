import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    const { data, error } = await supabase.from('reports').select('id, finding_type, ai_category');
    if (error) {
        console.error(error);
        return;
    }
    const felicitaciones = data.filter(r => r.finding_type === 'Felicitación' || r.ai_category === 'Felicitación');
    const findingTypeOnly = data.filter(r => r.finding_type === 'Felicitación');
    const aiCategoryOnly = data.filter(r => r.ai_category === 'Felicitación');
    const felicitacionesPlural = data.filter(r => r.finding_type?.includes('Felicitaci') || r.ai_category?.includes('Felicitaci'));
    
    console.log(`Total felicitaciones (exact match): ${felicitaciones.length}`);
    console.log(`By finding_type: ${findingTypeOnly.length}`);
    console.log(`By ai_category: ${aiCategoryOnly.length}`);
    console.log(`Total including plural or different casing: ${felicitacionesPlural.length}`);
    
    // Check if there's 'Felicitaciones' instead of 'Felicitación'
    const otherTypes = data.filter(r => r.finding_type?.toLowerCase().includes('felic') || r.ai_category?.toLowerCase().includes('felic'));
    console.log(`Total case-insensitive matches: ${otherTypes.length}`);
    
    console.log("Values found:", new Set(otherTypes.map(r => r.finding_type + " / " + r.ai_category)));
}

check();
