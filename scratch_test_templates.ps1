$Token = 'bb-13da769a-b85d-4b78-b5f6-a952b431441d'
$Url = 'https://app.builderbot.cloud/api/v2/9981a143-f290-4ebe-a426-21c4d234371c/whatsapp-template'
$Headers = @{
    'Content-Type' = 'application/json'
    'x-api-builderbot' = $Token
}
$Number = '5492645438114'

function Send-Template {
    param(
        [string]$TemplateName,
        [string]$Language,
        [string[]]$Params
    )
    
    $Parameters = @()
    foreach ($p in $Params) {
        $Parameters += @{
            type = 'text'
            text = $p
        }
    }
    
    $Body = @{
        to = $Number
        templateName = $TemplateName
        languageCode = $Language
        components = @(
            @{
                type = 'body'
                parameters = $Parameters
            }
        )
    } | ConvertTo-Json -Depth 10

    Write-Host "Sending $TemplateName ..."
    try {
        $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $Body
        Write-Host "Success: $($Response.success)"
    } catch {
        Write-Host "Error sending $TemplateName"
        Write-Host $_.Exception.Message
    }
}

# 1. Hallazgo
Send-Template -TemplateName "1_confirmacin_de_reporte_recibido_hallazgo" -Language "en" -Params @("SA-2026-TEST")

# 2. Felicitacion reportante
Send-Template "2_confirmacin_de_reporte_recibido_felicitacin" "es_AR" @("Contact Center", "SA-2026-F001")

# 3. Cuenta Autorizada
Send-Template -TemplateName "3_cuenta_de_usuario_autorizada" -Language "es_AR" -Params @("Lucas", "https://calidad.sanatorioargentino.com.ar/login")

# 4. Solicitud a Responsable
Send-Template -TemplateName "4_solicitud_de_gestin_a_responsable_de_sector" -Language "es_AR" -Params @("SA-2026-1234", "Contact Center", "El paciente reporta demora en atencion", "⚠️ Tipo: Desvío", "https://calidad.sanatorioargentino.com.ar/resolver-caso/SA-2026-1234")

# 5. Felicitacion al responsable
Send-Template "5_felicitacin_enviada_a_responsable_de_sector" "es_AR" @("Contact Center", "Excelente atencion telefonica y calidez", "SA-2026-F001", "https://calidad.sanatorioargentino.com.ar/resolver-caso/SA-2026-F001")

# 6. Respuesta calidad
Send-Template "6_respuesta_del_depto_de_calidad_al_sector" "es_AR" @("SA-2026-1234", "Por favor adjuntar los archivos solicitados previamente.")

# 7. Recordatorio SLA
Send-Template "7_recordatorio_automtico_vencimiento_de_tiempo_de_respuesta__sla" "en" @("SA-2026-1234", "Contact Center", "El paciente reporta demora en atencion", "https://calidad.sanatorioargentino.com.ar/resolver-caso/SA-2026-1234")

# 8. Recordatorio manual
Send-Template "8_recordatorio_manual_de_caso_pendiente_al_sector" "en" @("SA-2026-1234", "Contact Center", "https://calidad.sanatorioargentino.com.ar/resolver-caso/SA-2026-1234")

# 9. Solucion insuficiente
Send-Template "9_devolucin_de_ticket_por_solucin_insuficiente" "es_AR" @("SA-2026-1234", "La solucion planteada no incluye acciones preventivas a largo plazo.", "https://calidad.sanatorioargentino.com.ar/resolver-caso/SA-2026-1234")

# 10. Info adicional original
Send-Template "10_solicitud_de_informacin_adicional_al_reportante_original" "en" @("Contact Center", "SA-2026-1234", "¿Podria indicar el horario aproximado del incidente?", "https://calidad.sanatorioargentino.com.ar/info/SA-2026-1234")

# 11. Info adicional recibida
Send-Template "11_aviso_de_informacin_adicional_recibida_para_el_sector" "es_AR" @("SA-2026-1234", "Fue a las 14:30 hs", "Sin archivos adjuntos", "https://calidad.sanatorioargentino.com.ar/resolver-caso/SA-2026-1234")

# 12. Caso resuelto
Send-Template "12_aviso_de_caso_resuelto_al_reportante" "es_AR" @("SA-2026-1234", "Se hablo con el personal de admision y se implementaron refuerzos en el horario pico para reducir demoras.")
