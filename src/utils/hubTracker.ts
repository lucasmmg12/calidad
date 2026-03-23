/**
 * Hub Session Tracker — Calidad (Dora)
 * 
 * Usa RPC hub_log_external_event vía el cliente del Hub.
 * Todos los sistemas externos usan RPC porque no tienen
 * sesión autenticada en el Supabase del Hub (RLS bloquea inserts).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CALIDAD_SISTEMA_ID = '646c05c8-edbb-4201-8aa9-fb8bae8449f1'

const HUB_SUPABASE_URL = import.meta.env.VITE_HUB_SUPABASE_URL
const HUB_SUPABASE_ANON_KEY = import.meta.env.VITE_HUB_SUPABASE_ANON_KEY

let hubClient: SupabaseClient | null = null
function getHubClient(): SupabaseClient | null {
  if (!HUB_SUPABASE_URL || !HUB_SUPABASE_ANON_KEY) {
    console.warn('[HubTracker] Missing VITE_HUB_SUPABASE_URL or VITE_HUB_SUPABASE_ANON_KEY')
    return null
  }
  if (!hubClient) {
    hubClient = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY)
  }
  return hubClient
}

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip || null
  } catch { return null }
}

interface GeoResult { lat: number; lng: number }

function getGeoLocation(): Promise<GeoResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function trackLogin(_supabase: SupabaseClient, userId: string) {
  try {
    const hub = getHubClient()
    if (!hub) return

    const [ip, geo] = await Promise.all([getPublicIP(), getGeoLocation()])
    await hub.rpc('hub_log_external_event', {
      p_user_identifier: userId,
      p_evento: 'login',
      p_sistema_id: CALIDAD_SISTEMA_ID,
      p_ip: ip,
      p_user_agent: navigator.userAgent,
      p_latitud: geo?.lat || null,
      p_longitud: geo?.lng || null,
      p_metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function trackLogout(_supabase: SupabaseClient, userId: string) {
  try {
    const hub = getHubClient()
    if (!hub) return

    await hub.rpc('hub_log_external_event', {
      p_user_identifier: userId,
      p_evento: 'logout',
      p_sistema_id: CALIDAD_SISTEMA_ID,
      p_ip: null,
      p_user_agent: navigator.userAgent,
      p_latitud: null,
      p_longitud: null,
      p_metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}
