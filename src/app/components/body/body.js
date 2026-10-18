"use client";

import Section from "./components/section/section";
import { CAROUSEL_ITEMS } from "./components/section/components/project-carousel/carousel-config";
import "./body.css";

// Frases que se tiñen de acento en el revelado de Sobre mí (texto intacto).
const SOBRE_MI_ACCENTS = [
  "SAP BTP",
  "MundoCloud",
  "ecosistema JavaScript",
];

const SOBRE_MI_LINKS = {
  MundoCloud: "https://www.mundocloud.co",
  Academlo: "https://www.academlo.com",
};

export default function Body() {
  return (
    <div className="body">
      <Section id={"hero"} sectionType={"hero"} title={"Horangel Millan"} subtitle={"Full-Stack Developer | SAP BTP Consultant"} content={"Desarrollador Full-Stack especializado en JavaScript y cloud.\nConstruyo aplicaciones empresariales e integraciones SAP BTP escalables."} />
      <Section id={"sobre-mi"} title={"Sobre mí"} subtitle={"Consultor SAP BTP · Full-Stack"} content={"Consultor SAP BTP en MundoCloud desde 2022, formado como Full-Stack en Academlo. Empecé construyendo para la web con el ecosistema JavaScript, del navegador al servidor y las bases de datos; después me moví a la nube empresarial de SAP: interfaces, servicios, integraciones y automatización de procesos.\nMás de 4 años construyendo software que conecta el negocio con la tecnología."} reveal revealAccents={SOBRE_MI_ACCENTS} revealLinks={SOBRE_MI_LINKS} />
      <Section id={"proyectos"} title={"Proyectos"} subtitle={"Selección"} content={"Arrastra, usa la rueda horizontal o las flechas."} carouselItems={CAROUSEL_ITEMS} />
      <Section id={"contacto"} title={"Contacto"} subtitle={"¿Hablamos?"} content={"Escríbeme por LinkedIn o GitHub: horangelmillan.\nAbierto a roles Full-Stack y consultoría SAP BTP."} />
    </div>
  );
}
