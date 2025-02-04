"use client";
import styles from "./page.module.css";
import Nav from "./components/nav/nav";
import Body from "./components/body/body";
import Footer from "./components/footer/footer";
import useScrollData from "./hooks/useScrollData";

export default function Home() {
  useScrollData();

  return (
    <div className={`${styles.home}`}>
      <Nav></Nav>
      <Body></Body>
      <Footer></Footer>
    </div>
  );
}
