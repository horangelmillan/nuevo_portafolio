"use client";
import styles from "./page.module.css";
import Nav from "./components/nav/nav";
import Body from "./components/body/body";
import Footer from "./components/footer/footer";
import HeroBackground from "./components/body/components/section/components/hero-background/HeroBackground";
import useScrollData from "./hooks/useScrollData";

export default function Home() {
  useScrollData();

  return (
    <main className={`${styles.home}`}>
      <HeroBackground />
      <Nav></Nav>
      <Body></Body>
      <Footer></Footer>
    </main>
  );
}
