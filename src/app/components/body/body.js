"use client";

import Section from "./components/section/section";
import "./body.css";

export default function Body() {
  return (
    <div className="body">
      <Section sectionType={"hero"} title={"Horangel Millan"} subtitle={"Full-Stack Developer | SAP BTP Consultant"} content={"Desarrollador Full-Stack especializado en JavaScript y cloud.\nConstruyo aplicaciones empresariales e integraciones SAP BTP escalables."} />
      <Section title={"Sobre mí"} subtitle={"De CRA + Express a Next.js"} content={"Retomando mi portfolio tras migrarlo a Next.js 15 + React 19 + Zustand + pnpm.\nMe enfoco en frontend moderno, integraciones cloud y código mantenible."} />
      <Section title={"Proyectos"} subtitle={"Selección"} content={"Portfolio (este sitio) · Integraciones SAP BTP · Apps empresariales JavaScript.\nPróximo paso: publicar casos con demo, repo y métricas."} />
      <Section title={"Contacto"} subtitle={"¿Hablamos?"} content={"Escríbeme por LinkedIn o GitHub: horangelmillan.\nAbierto a roles Full-Stack y consultoría SAP BTP."} />
    </div>
  );
}
