import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={`${styles.footer} glass`}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.logo}>
              <svg className={styles.logoIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.886L4.2 9.2l4.8 4.186L7.088 19.5 12 16l4.912 3.5-1.912-6.114 4.8-4.186-5.888-.314L12 3z"/>
              </svg>
              <span className="text-gradient">Central do Autônomo</span>
            </Link>
            <p className={styles.footerSlogan}>
              A ponte direta entre o cliente e o profissional de excelência. Sem taxas de intermediação, direto e transparente.
            </p>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </a>
            </div>
          </div>

          <div className={styles.footerLinksGroup}>
            <h3 className={styles.footerTitle}>Plataforma</h3>
            <ul className={styles.footerLinks}>
              <li><Link href="/">Buscar Autônomos</Link></li>
              <li><Link href="/dashboard">Anunciar Serviço</Link></li>
              <li><Link href="/dashboard">Entrar no Painel</Link></li>
              <li><Link href="/ajuda">Dúvidas Frequentes</Link></li>
            </ul>
          </div>

          <div className={styles.footerLinksGroup}>
            <h3 className={styles.footerTitle}>Suporte e Legal</h3>
            <ul className={styles.footerLinks}>
              <li><Link href="/termos">Termos de Uso</Link></li>
              <li><Link href="/privacidade">Política de Privacidade</Link></li>
              <li><Link href="/ajuda">Central de Ajuda</Link></li>
              <li><a href="mailto:suporte@centraldoautonomo.com">suporte@centraldoautonomo.com</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Central do Autônomo. Desenvolvido com carinho para os profissionais brasileiros.</p>
          <p className={styles.footerLocation}>São Paulo - SP</p>
        </div>
      </div>
    </footer>
  );
}
