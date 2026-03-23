/**
 * Hub Session Tracker — Sanatorio Argentino (Calidad)
 * 
 * Usa un cliente Supabase dedicado al Hub (NO el de Calidad)
 * porque hub_logs_sesion vive en el proyecto Supabase del Hub.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CALIDAD_SISTEMA_ID = '646c05c8-edbb-4201-8aa9-fb8bae8449f1'

// Cliente dedicado al Hub
const HUB_SUPABASE_URL = import.meta.env.VITE_HUB_SUPABASE_URL as string | undefined
const HUB_SUPABASE_ANON_KEY = import.meta.env.VITE_HUB_SUPABASE_ANON_KEY as string | undefined

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

interface IpGeoResult {
  ip: string | null
  lat: number | null
  lng: number | null
}

/**
 * Obtiene IP pública + geolocalización basada en IP en un solo request.
 * No requiere permiso del navegador (a diferencia de navigator.geolocation).
 * Usa ipapi.co que devuelve IP + lat/lng en una sola llamada.
 */
async function getIpAndGeo(): Promise<IpGeoResult> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return {
      ip: data.ip || null,
      lat: data.latitude || null,
      lng: data.longitude || null,
    }
  } catch {
    // Fallback: intentar al menos obtener la IP
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      return { ip: data.ip || null, lat: null, lng: null }
    } catch {
      return { ip: null, lat: null, lng: null }
    }
  }
}

export async function trackLogin(_supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    const hub = getHubClient()
    if (!hub) return

    const { ip, lat, lng } = await getIpAndGeo()
    await hub.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'login',
      sistema_id: CALIDAD_SISTEMA_ID,
      ip_address: ip,
      user_agent: navigator.userAgent,
      latitud: lat,
      longitud: lng,
      metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}

export async function trackLogout(_supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    const hub = getHubClient()
    if (!hub) return

    await hub.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'logout',
      sistema_id: CALIDAD_SISTEMA_ID,
      user_agent: navigator.userAgent,
      metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}
