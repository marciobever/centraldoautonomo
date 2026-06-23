"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Header.module.css";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getProfessionalById } from "@/lib/dbBridge";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [avatarColor, setAvatarColor] = useState("var(--primary)");

  useEffect(() => {
    // Fallback Mock Mode
    if (!isFirebaseConfigured || !auth) {
      const localMockUser = localStorage.getItem("central_mock_user");
      if (localMockUser) {
        try {
          const parsed = JSON.parse(localMockUser);
          setUser(parsed);
          
          // Load name and avatar color
          getProfessionalById(parsed.uid).then((prof) => {
            if (prof) {
              setProfileName(prof.name);
              setAvatarColor(prof.avatarColor);
            }
          });
        } catch (e) {}
      }
      return;
    }

    // Real Firebase Mode
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getProfessionalById(firebaseUser.uid);
          if (prof) {
            setProfileName(prof.name);
            setAvatarColor(prof.avatarColor);
          }
        } catch (e) {}
      } else {
        setUser(null);
        setProfileName("");
      }
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className={`${styles.header} glass`}>
      <div className={styles.container}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            <svg className={styles.logoIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.886L4.2 9.2l4.8 4.186L7.088 19.5 12 16l4.912 3.5-1.912-6.114 4.8-4.186-5.888-.314L12 3z"/>
            </svg>
            <span className="text-gradient">Central do Autônomo</span>
          </Link>
          
          {user ? (
            <Link href="/dashboard" className={styles.userProfileLink} title="Ir para o Painel">
              <span className={styles.welcomeText}>Olá, {profileName ? profileName.split(" ")[0] : "Profissional"}</span>
              <div className={styles.userAvatar} style={{ background: avatarColor }}>
                {profileName ? getInitials(profileName) : "PA"}
              </div>
            </Link>
          ) : (
            <Link href="/dashboard" className={styles.dashboardBtn}>
              Acessar Painel
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
