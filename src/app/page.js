"use client";
import styles from "./page.module.css";
import Nav from "./components/nav/nav";
import Body from "./components/body/body";
import Footer from "./components/footer/footer";
import Preloader from "./components/preloader/Preloader";
import AboutOverlay from "./components/about/AboutOverlay";
import CaseOverlay from "./components/case/CaseOverlay";
import HeroBackground from "./components/body/components/section/components/hero-background/HeroBackground";
import useScrollData from "./hooks/useScrollData";
import useSectionSnap from "./hooks/useSectionSnap";

export default function Home() {
  useScrollData();
  useSectionSnap();

  return (
    <main className={`${styles.home}`}>
      <Preloader />
      <HeroBackground />
      <Nav></Nav>
      <Body></Body>
      <Footer></Footer>
      <AboutOverlay />
      <CaseOverlay />
    </main>
  );
}
