import React, { useEffect } from 'react';
import { ShieldCheck, FileText, Lock, EyeOff, Scale, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const LegalContent: React.FC = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    const isPrivacy = pathname === '/privacidad';

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Nav Back */}
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-sanatorio-primary transition-colors mb-8 font-medium">
                <ArrowLeft className="w-4 h-4" />
                Volver al Formulario
            </Link>

            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-sanatorio-primary to-[#00385c] p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 flex items-center gap-4 mb-4">
                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                            {isPrivacy ? <ShieldCheck className="w-8 h-8 text-sanatorio-secondary" /> : <Scale className="w-8 h-8 text-sanatorio-secondary" />}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isPrivacy ? 'Política de Privacidad' : 'Términos y Condiciones'}
                        </h1>
                    </div>
                    <p className="text-blue-100/80 max-w-2xl font-medium">
                        {isPrivacy
                            ? 'Cómo protegemos tu identidad y gestionamos la información en el Sanatorio Argentino.'
                            : 'Reglas fundamentales para el uso responsable del sistema de reporte de calidad.'}
                    </p>
                </div>

                <div className="p-8 md:p-12 space-y-10">
                    {isPrivacy ? (
                        <>
                            {/* PRIVACY CONTENT */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-sanatorio-primary mb-2">
                                    <EyeOff className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">1. Anonimato por Diseño</h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Nuestra plataforma ha sido construida bajo el principio de <strong>Privacidad por Defecto</strong>. El sistema no captura automáticamente direcciones IP, geolocalización, ni metadatos personales que permitan identificarte sin tu consentimiento explícito.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-sanatorio-primary mb-2">
                                    <Lock className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">2. Gestión del Número de Contacto</h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Existe una única excepción al anonimato total: si decides voluntariamente ingresar tu número de WhatsApp para recibir notificaciones.
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                                    <li>Si usas el <strong>Modo Anónimo</strong>: No se guarda ningún dato de contacto en nuestra base de datos.</li>
                                    <li>Si usas el <strong>Modo Identificado</strong>: Tu número se utiliza exclusivamente para enviarte el código de seguimiento y la resolución de tu caso.</li>
                                    <li><strong>Seguridad:</strong> No compartimos tu número con terceros ni lo utilizamos para fines comerciales o de marketing.</li>
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-sanatorio-primary mb-2">
                                    <FileText className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">3. Almacenamiento de Evidencia</h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Las imágenes o archivos adjuntos se almacenan en servidores seguros con cifrado en reposo. Una vez que el caso se cierra (resuelve o descarta), el equipo de Calidad puede proceder a la eliminación de archivos que contengan información sensible no relevante para la mejora del servicio.
                                </p>
                            </section>
                        </>
                    ) : (
                        <>
                            {/* TERMS CONTENT */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-sanatorio-primary mb-2">
                                    <FileText className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">1. Propósito del Sistema</h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Este canal está destinado exclusivamente a reportar incidentes, sugerencias o fallas relacionadas con la calidad de atención y seguridad del paciente en el Sanatorio Argentino. No debe ser utilizado como un canal de emergencias médicas inmediatas ni para difamación personal.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-sanatorio-primary mb-2">
                                    <ShieldCheck className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">2. Responsabilidad del Usuario</h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Al utilizar el sistema, te comprometes a brindar información veraz y respetuosa. El uso malintencionado, la carga de contenido ilegal o el acoso a través de esta vía podrá resultar en la restricción definitiva de acceso a la plataforma.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-sanatorio-primary mb-2">
                                    <Scale className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">3. Compromiso de Respuesta</h2>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    El Sanatorio Argentino, a través de su Departamento de Calidad, se compromete a revisar cada reporte ingresado. Sin embargo, la resolución efectiva dependerá de la complejidad de la situación y la disponibilidad de recursos, reservándose el derecho de descartar reportes que no cumplan con los criterios mínimos de relevancia.
                                </p>
                            </section>
                        </>
                    )}

                    <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                        <p>Última actualización: Enero 2026</p>
                        <div className="flex gap-4">
                            <Link to={isPrivacy ? "/terminos" : "/privacidad"} className="text-sanatorio-primary hover:underline font-bold">
                                Ver {isPrivacy ? 'Términos y Condiciones' : 'Política de Privacidad'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalContent;
