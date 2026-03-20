/**
 * Hub Session Tracker — Sanatorio Argentino
 * Registra login/logout en hub_logs_sesion para el Monitor centralizado.
 */

const CALIDAD_SISTEMA_ID = '646c05c8-edbb-4201-8aa9-fb8bae8449f1'

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip || null
  } catch { return null }
}

function getGeoLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  })
}

export async function trackLogin(supabase, userId) {
  try {
    const [ip, geo] = await Promise.all([getPublicIP(), getGeoLocation()])
    await supabase.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'login',
      sistema_id: CALIDAD_SISTEMA_ID,
      ip_address: ip,
      user_agent: navigator.userAgent,
      latitud: geo?.lat || null,
      longitud: geo?.lng || null,
      metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}

export async function trackLogout(supabase, userId) {
  try {
    await supabase.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'logout',
      sistema_id: CALIDAD_SISTEMA_ID,
      user_agent: navigator.userAgent,
      metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}
