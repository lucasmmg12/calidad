import { Info } from 'lucide-react';

export default function InstructionsPanel() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-700 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-sm mb-1">Instrucciones de la Auditoría</h3>
          <ul className="text-xs text-blue-800 space-y-2 list-disc pl-4">
            <li><strong>Puntaje:</strong> Selecciona de 0 a 3 según el cumplimiento. <strong>0</strong> es satisfactorio (Azul oscuro) y <strong>3</strong> es deficiente (Blanco).</li>
            <li><strong>Dictado por Voz:</strong> Usa el ícono del micrófono <span className="inline-block align-middle">🎙️</span> en las observaciones para dictar texto automáticamente.</li>
            <li><strong>Historial:</strong> Al terminar, usa el botón "Guardar y Finalizar" para archivarla en el historial y limpiar la plantilla.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
