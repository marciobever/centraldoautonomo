"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { Service, Lead, Professional, Expense, Appointment, Product } from "@/data/mockData";
import { PROFESSIONAL_CATEGORIES, normalizeCategory } from "@/data/categories";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import QRCode from "qrcode";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getLeads, 
  getProfessionalById, 
  createProfessional, 
  checkUsernameAvailable, 
  saveService, 
  deleteService, 
  updateLeadStatus, 
  saveProfessionalProfile,
  getEstimates,
  saveEstimate,
  updateEstimateStatus,
  deleteEstimate,
  Estimate,
  getReceipts,
  saveReceipt,
  deleteReceipt,
  Receipt,
  getExpenses,
  saveExpense,
  deleteExpense,
  getAppointments,
  saveAppointment,
  deleteAppointment,
  getProducts,
  saveProduct,
  deleteProduct,
  getReviews,
  saveReviewReply,
  Review
} from "@/lib/dbBridge";

const gradients = [
  "linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))",
  "linear-gradient(135deg, oklch(72% 0.16 350), oklch(65% 0.2 295))",
  "linear-gradient(135deg, oklch(75% 0.17 195), oklch(76% 0.17 142))",
  "linear-gradient(135deg, oklch(80% 0.14 78), oklch(72% 0.16 350))",
  "linear-gradient(135deg, oklch(70% 0.17 195), oklch(65% 0.21 295))"
];

const conditionLabels: Record<string, string> = {
  novo: "Novo",
  semi_novo: "Seminovo",
  usado_excelente: "Usado - Excelente",
  usado_bom: "Usado - Bom",
  usado_marcas: "Usado - Marcas de Uso"
};

const categoryLabels: Record<string, string> = {
  ferramentas: "Ferramentas",
  materiais: "Materiais",
  decoracao: "Decoração",
  eletronicos: "Eletrônicos",
  outros: "Outros"
};

const getPatternOverlay = (type?: string, accentColor?: string) => {
  const strokeColor = accentColor || "rgba(255,255,255,0.25)";
  if (type === "geometric") {
    return (
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.25 }} fill="none">
        <path d="M-20 -20 L360 220 M10 -40 L400 180 M-60 10 L300 250" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="280" cy="50" r="40" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="280" cy="50" r="70" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    );
  }
  if (type === "mesh") {
    return (
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(0,0,0,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
        mixBlendMode: "overlay"
      }} />
    );
  }
  if (type === "glass") {
    return (
      <div style={{
        position: "absolute",
        inset: "10px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(5px)",
        pointerEvents: "none"
      }} />
    );
  }
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.15 }} fill="none">
      <rect x="12" y="12" width="316" height="176" rx="8" stroke={strokeColor} strokeWidth="1" />
    </svg>
  );
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"inicio" | "leads" | "servicos" | "orcador" | "recibos" | "financas" | "agenda" | "perfil" | "pagamentos">("inicio");

  // Stripe States
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ type: "success" | "error" | "refresh" | null; message: string }>({ type: null, message: "" });
  const [stripeLoginLoading, setStripeLoginLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const successParam = params.get("stripe_success");
      const errorParam = params.get("stripe_error");
      const refreshParam = params.get("stripe_refresh");

      if (tabParam === "payments") {
        setActiveTab("pagamentos");
      }

      if (successParam === "true") {
        setStripeStatus({ type: "success", message: "Sua conta bancária foi conectada com sucesso via Stripe!" });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (errorParam) {
        let errMsg = "Ocorreu um erro ao conectar sua conta Stripe.";
        if (errorParam === "details_not_submitted") {
          errMsg = "Você não concluiu o preenchimento dos dados na Stripe.";
        }
        setStripeStatus({ type: "error", message: errMsg });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (refreshParam === "true") {
        setStripeStatus({ type: "refresh", message: "Por favor, tente concluir a conexão Stripe novamente." });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleConnectStripe = async () => {
    if (!professional) return;
    setStripeLoading(true);
    setStripeStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/stripe/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profId: professional.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeStatus({ type: "error", message: data.error || "Não foi possível criar o link do Stripe." });
      }
    } catch (e) {
      setStripeStatus({ type: "error", message: "Erro de conexão com o servidor." });
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeLogin = async () => {
    if (!professional || !professional.stripeAccountId) return;
    setStripeLoginLoading(true);
    setStripeStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/stripe/login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeAccountId: professional.stripeAccountId }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        setStripeStatus({ type: "error", message: data.error || "Não foi possível criar o link de login da Stripe." });
      }
    } catch (e) {
      setStripeStatus({ type: "error", message: "Erro de conexão com o servidor." });
    } finally {
      setStripeLoginLoading(false);
    }
  };

  // Authentication States
  const [user, setUser] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form fields for Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form fields for registration
  const [regName, setRegName] = useState("");
  const [regTitle, setRegTitle] = useState("");
  const [regCategory, setRegCategory] = useState("Pintor");
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regWhatsapp, setRegWhatsapp] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regBio, setRegBio] = useState("");

  // Form fields for profile editing
  const [profileName, setProfileName] = useState("");
  const [profileTitle, setProfileTitle] = useState("");
  const [profileCategory, setProfileCategory] = useState("");
  const [customProfileCategoryText, setCustomProfileCategoryText] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileLogoUrl, setProfileLogoUrl] = useState("");
  const [profilePixKeyType, setProfilePixKeyType] = useState<"cpf" | "cnpj" | "celular" | "email" | "chave_aleatoria" | "">("");
  const [profilePixKey, setProfilePixKey] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isImprovingBio, setIsImprovingBio] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const initProfileCategory = (category: string) => {
    if (PROFESSIONAL_CATEGORIES.includes(category)) {
      setProfileCategory(category);
      setCustomProfileCategoryText("");
    } else {
      setProfileCategory("outro");
      setCustomProfileCategoryText(category);
    }
  };

  // Persistence States (loaded from Firestore or fallbacks)
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [orcadorSubTab, setOrcadorSubTab] = useState<"emitir" | "historico">("emitir");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [estimateTheme, setEstimateTheme] = useState<string>("modern");
  const [receiptTheme, setReceiptTheme] = useState<string>("modern");
  const [contractTheme, setContractTheme] = useState<string>("modern");
  const [isContractSigOpen, setIsContractSigOpen] = useState(false);
  const [activeEstimateForContract, setActiveEstimateForContract] = useState<Estimate | null>(null);
  
  // Product States
  const [products, setProducts] = useState<Product[]>([]);
  const [servicesSubTab, setServicesSubTab] = useState<"servicos" | "produtos">("servicos");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductStatus, setNewProductStatus] = useState<"ativo" | "esgotado">("ativo");
  const [newProductColor, setNewProductColor] = useState("linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductCondition, setNewProductCondition] = useState<Product["condition"]>("novo");
  const [newProductCategory, setNewProductCategory] = useState<Product["category"]>("outros");
  const [newProductLocation, setNewProductLocation] = useState("");
  const [newProductImageUrls, setNewProductImageUrls] = useState<string[]>([]);
  const [isUploadingProductPhoto, setIsUploadingProductPhoto] = useState(false);
  
  // Expense States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<"material" | "transporte" | "ferramentas" | "alimentacao" | "outros">("material");
  const [expenseValue, setExpenseValue] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState("");
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [receiptSubTab, setReceiptSubTab] = useState<"emitir" | "historico">("emitir");
  const [reciboValue, setReciboValue] = useState<number>(0);
  const [reciboClientName, setReciboClientName] = useState("");
  const [reciboReferente, setReciboReferente] = useState("");
  const [reciboDate, setReciboDate] = useState("");
  const [isGeneratingRecibo, setIsGeneratingRecibo] = useState(false);

  // Modal States
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceUnit, setNewServiceUnit] = useState("m²");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // Budget Generator (Orçador) Form States
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [estimateDate, setEstimateDate] = useState("");
  const [validityDays, setValidityDays] = useState(10);
  const [estimateNotes, setEstimateNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [estimateItems, setEstimateItems] = useState<{ id: string; name: string; quantity: number; price: number }[]>([
    { id: "item_1", name: "", quantity: 1, price: 0 }
  ]);

  // Appointment & Calendar States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptTitle, setApptTitle] = useState("");
  const [apptClientName, setApptClientName] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [isSavingAppt, setIsSavingAppt] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // AI Insights States
  const [aiInsight, setAiInsight] = useState("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // Billing Copilot States
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingEstimate, setBillingEstimate] = useState<Estimate | null>(null);
  const [billingTone, setBillingTone] = useState<"amigavel" | "formal" | "firme">("amigavel");
  const [billingMessage, setBillingMessage] = useState("");
  const [isGeneratingBillingMessage, setIsGeneratingBillingMessage] = useState(false);

  // 3D Digital Card States
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [profileQrCodeUrl, setProfileQrCodeUrl] = useState("");
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState("");
  const [aiCardPrompt, setAiCardPrompt] = useState("");
  const [isGeneratingCardDesign, setIsGeneratingCardDesign] = useState(false);

  // Initialize reply inputs when reviews change
  useEffect(() => {
    if (reviews && reviews.length > 0) {
      const inputs: Record<string, string> = {};
      reviews.forEach(r => {
        if (r.reply) {
          inputs[r.id] = r.reply;
        }
      });
      setReplyInputs(inputs);
    }
  }, [reviews]);

  // Auth and data initialization
  useEffect(() => {
    // Fallback Mock Mode
    if (!isFirebaseConfigured || !auth) {
      async function loadMockData() {
        const localMockUser = localStorage.getItem("central_mock_user");
        let mockUid = "prof_1";
        let mockEmail = "pedro@central.com";
        
        if (localMockUser) {
          try {
            const parsedUser = JSON.parse(localMockUser);
            if (parsedUser.uid && parsedUser.email) {
              mockUid = parsedUser.uid;
              mockEmail = parsedUser.email;
            }
          } catch (e) {
            console.error("Error parsing localMockUser:", e);
          }
        }
        
        setUser({ uid: mockUid, email: mockEmail });
        
        const prof = await getProfessionalById(mockUid);
        if (prof) {
          setProfessional(prof);
          setServices(prof.services || []);
          setProducts(prof.products || []);
          
          setProfileName(prof.name);
          setProfileTitle(prof.title);
          initProfileCategory(prof.category);
          setProfileCity(prof.city);
          setProfileWhatsapp(prof.whatsapp);
          setProfileBio(prof.bio);
          setProfileLogoUrl(prof.logoUrl || "");
          setProfilePixKeyType(prof.pixKeyType || "");
          setProfilePixKey(prof.pixKey || "");
          
          const leadsList = await getLeads(prof.id);
          setLeads(leadsList);
          const estimatesList = await getEstimates(prof.id);
          setEstimates(estimatesList);
          const receiptsList = await getReceipts(prof.id);
          setReceipts(receiptsList);
          const expensesList = await getExpenses(prof.id);
          setExpenses(expensesList);
          const apptsList = await getAppointments(prof.id);
          setAppointments(apptsList);
          const reviewsList = await getReviews(prof.id);
          setReviews(reviewsList);
        } else {
          // If the mock user was deleted or doesn't have a profile, reset the session
          setUser(null);
          setProfessional(null);
        }
        setAuthLoading(false);
      }
      loadMockData();
      
      const today = new Date().toISOString().split("T")[0];
      setEstimateDate(today);
      setReciboDate(today);
      setExpenseDate(today);
      return;
    }

    // Real Firebase Mode
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      setAuthError("");
      
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getProfessionalById(firebaseUser.uid);
          if (prof) {
            setProfessional(prof);
            setServices(prof.services || []);
            setProducts(prof.products || []);
            
            setProfileName(prof.name);
            setProfileTitle(prof.title);
            initProfileCategory(prof.category);
            setProfileCity(prof.city);
            setProfileWhatsapp(prof.whatsapp);
            setProfileBio(prof.bio);
            setProfileLogoUrl(prof.logoUrl || "");
            setProfilePixKeyType(prof.pixKeyType || "");
            setProfilePixKey(prof.pixKey || "");

            const leadsList = await getLeads(prof.id);
            setLeads(leadsList);
            const estimatesList = await getEstimates(prof.id);
            setEstimates(estimatesList);
            const receiptsList = await getReceipts(prof.id);
            setReceipts(receiptsList);
            const expensesList = await getExpenses(prof.id);
            setExpenses(expensesList);
            const apptsList = await getAppointments(prof.id);
            setAppointments(apptsList);
            const reviewsList = await getReviews(prof.id);
            setReviews(reviewsList);
          } else {
            setProfessional(null);
          }
        } catch (err: any) {
          console.error("Error loading professional data:", err);
          setAuthError("Erro ao carregar dados do perfil.");
        }
      } else {
        setUser(null);
        setProfessional(null);
        setServices([]);
        setProducts([]);
        setLeads([]);
        setEstimates([]);
        setReceipts([]);
        setAppointments([]);
      }
      setAuthLoading(false);
    });

    const today = new Date().toISOString().split("T")[0];
    setEstimateDate(today);
    setReciboDate(today);
    setExpenseDate(today);

    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    
    // Fallback Mock Mode
    if (!isFirebaseConfigured || !auth) {
      try {
        let mockUid = "prof_1";
        if (email.toLowerCase().includes("mariana")) mockUid = "prof_2";
        else if (email.toLowerCase().includes("lucas")) mockUid = "prof_3";
        else if (email.toLowerCase().includes("clara")) mockUid = "prof_4";
        else if (email.toLowerCase().includes("marcos")) mockUid = "prof_5";
        else if (email.toLowerCase().includes("pedro")) mockUid = "prof_1";
        else {
          // Check if we have a saved mock user for this email in storage keys
          let foundUid = "";
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("central_profile_")) {
              try {
                const profile = JSON.parse(localStorage.getItem(key) || "");
                if (email.toLowerCase().startsWith(profile.username.toLowerCase())) {
                  foundUid = profile.id;
                  break;
                }
              } catch (e) {}
            }
          }
          mockUid = foundUid || "prof_" + Date.now();
        }

        const mockUser = { uid: mockUid, email };
        localStorage.setItem("central_mock_user", JSON.stringify(mockUser));
        setUser(mockUser);

        // Fetch or create profile
        let prof = await getProfessionalById(mockUid);
        if (!prof) {
          // Create new mock profile
          const cleanName = email.split("@")[0];
          prof = {
            id: mockUid,
            username: cleanName.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
            title: "Profissional Autônomo",
            category: "Pintor",
            city: "São Paulo - SP",
            rating: 5.0,
            reviewsCount: 1,
            avatarColor: gradients[Math.floor(Math.random() * gradients.length)],
            bio: "Biografia profissional.",
            whatsapp: "5511999999999",
            gallery: [],
            services: []
          };
          await createProfessional(prof);
        }

        setProfessional(prof);
        setServices(prof.services || []);
        setProfileName(prof.name);
        setProfileTitle(prof.title);
        initProfileCategory(prof.category);
        setProfileCity(prof.city);
        setProfileWhatsapp(prof.whatsapp);
        setProfileBio(prof.bio);
        setProfileLogoUrl(prof.logoUrl || "");
        setProfilePixKeyType(prof.pixKeyType || "");
        setProfilePixKey(prof.pixKey || "");

        const leadsList = await getLeads(prof.id);
        setLeads(leadsList);
        const estimatesList = await getEstimates(prof.id);
        setEstimates(estimatesList);
        const receiptsList = await getReceipts(prof.id);
        setReceipts(receiptsList);
        const expensesList = await getExpenses(prof.id);
        setExpenses(expensesList);
        const reviewsList = await getReviews(prof.id);
        setReviews(reviewsList);
      } catch (err: any) {
        setAuthError("Erro na simulação de login: " + err.message);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      let friendlyMsg = "Falha ao entrar. Verifique seu e-mail e senha.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        friendlyMsg = "E-mail ou senha incorretos.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMsg = "Formato de e-mail inválido.";
      }
      setAuthError(friendlyMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const cleanUsername = regUsername.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanUsername) {
      setAuthError("Escolha um link público válido (apenas letras, números e traços).");
      setAuthLoading(false);
      return;
    }

    // Fallback Mock Mode
    if (!isFirebaseConfigured || !auth) {
      try {
        const isAvailable = await checkUsernameAvailable(cleanUsername);
        if (!isAvailable) {
          setAuthError("Este link público (username) já está em uso por outro profissional. Escolha outro.");
          setAuthLoading(false);
          return;
        }

        const uid = "prof_" + Date.now();
        const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

        const newProf: Professional = {
          id: uid,
          username: cleanUsername,
          name: regName,
          title: regTitle,
          category: regCategory === "outro" ? normalizeCategory(customCategoryText) : regCategory,
          city: regCity,
          rating: 5.0,
          reviewsCount: 1,
          avatarColor: randomGradient,
          bio: regBio,
          whatsapp: regWhatsapp.replace(/\D/g, ""),
          gallery: [],
          services: []
        };

        // Save profile
        await createProfessional(newProf);
        setProfessional(newProf);

        const mockUser = { uid, email };
        localStorage.setItem("central_mock_user", JSON.stringify(mockUser));
        setUser(mockUser);

        setProfileName(newProf.name);
        setProfileTitle(newProf.title);
        initProfileCategory(newProf.category);
        setProfileCity(newProf.city);
        setProfileWhatsapp(newProf.whatsapp);
        setProfileBio(newProf.bio);
        setProfileLogoUrl("");

        setEmail("");
        setPassword("");
        setRegName("");
        setRegTitle("");
        setRegCity("");
        setRegWhatsapp("");
        setRegUsername("");
        setRegBio("");
        setCustomCategoryText("");
      } catch (err: any) {
        setAuthError("Erro na simulação de cadastro: " + err.message);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    try {
      const isAvailable = await checkUsernameAvailable(cleanUsername);
      if (!isAvailable) {
        setAuthError("Este link público (username) já está em uso por outro profissional. Escolha outro.");
        setAuthLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

      const newProf: Professional = {
        id: uid,
        username: cleanUsername,
        name: regName,
        title: regTitle,
        category: regCategory === "outro" ? normalizeCategory(customCategoryText) : regCategory,
        city: regCity,
        rating: 5.0,
        reviewsCount: 1,
        avatarColor: randomGradient,
        bio: regBio,
        whatsapp: regWhatsapp.replace(/\D/g, ""),
        gallery: [],
        services: []
      };

      await createProfessional(newProf);
      setProfessional(newProf);
      
      setProfileName(newProf.name);
      setProfileTitle(newProf.title);
      initProfileCategory(newProf.category);
      setProfileCity(newProf.city);
      setProfileWhatsapp(newProf.whatsapp);
      setProfileBio(newProf.bio);
      setProfileLogoUrl("");

      setEmail("");
      setPassword("");
      setRegName("");
      setRegTitle("");
      setRegCity("");
      setRegWhatsapp("");
      setRegUsername("");
      setRegBio("");
      setCustomCategoryText("");
    } catch (err: any) {
      console.error(err);
      let friendlyMsg = "Falha ao criar conta: " + err.message;
      if (err.code === "auth/email-already-in-use") {
        friendlyMsg = "Este e-mail já está cadastrado em outra conta.";
      } else if (err.code === "auth/weak-password") {
        friendlyMsg = "A senha deve ter pelo menos 6 caracteres.";
      }
      setAuthError(friendlyMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      alert("Simulando logout no modo offline.");
      localStorage.removeItem("central_mock_user");
      setUser(null);
      setProfessional(null);
      return;
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Save profile fields
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;
    setIsSavingProfile(true);
    try {
      const savedCategory = profileCategory === "outro" ? normalizeCategory(customProfileCategoryText) : profileCategory;
      const updatedFields = {
        name: profileName,
        title: profileTitle,
        category: savedCategory,
        city: profileCity,
        whatsapp: profileWhatsapp,
        bio: profileBio,
        logoUrl: profileLogoUrl,
        pixKeyType: profilePixKeyType,
        pixKey: profilePixKey
      };
      await saveProfessionalProfile(professional.id, updatedFields);
      setProfessional({ ...professional, ...updatedFields });
      alert("Perfil atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar perfil: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Submit official response to review
  const handleSaveReply = async (reviewId: string) => {
    if (!professional) return;
    const replyText = replyInputs[reviewId]?.trim();
    if (!replyText) {
      alert("Por favor, digite uma resposta antes de enviar.");
      return;
    }

    setSubmittingReplyId(reviewId);
    try {
      await saveReviewReply(professional.id, reviewId, replyText);
      
      // Update local state
      const repliedAt = new Date().toISOString();
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyText, repliedAt } : r));
      
      alert("Resposta enviada com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar resposta: " + err.message);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // Refs for Signature Canvases
  const estimateCanvasRef = useRef<HTMLCanvasElement>(null);
  const receiptCanvasRef = useRef<HTMLCanvasElement>(null);
  const contractModalCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  const getCanvasCoords = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStartDrawing = (e: any, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a"; // dark signature color
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const coords = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    e.preventDefault();
  };

  const handleDraw = (e: any, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    e.preventDefault();
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Helper to optimize and convert image to Base64
  const optimizeAndToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => {
          reject(new Error("Erro ao carregar a imagem."));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error("Erro ao ler o arquivo."));
      };
      reader.readAsDataURL(file);
    });
  };

  // Improve Bio with AI Gemini
  const handleImproveBioWithAI = async () => {
    if (!profileBio.trim()) {
      alert("Por favor, digite um rascunho de biografia primeiro para que a IA possa melhorá-lo.");
      return;
    }

    setIsImprovingBio(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "custom",
          prompt: `Você é um redator profissional especializado em marketing pessoal e bio de prestadores de serviços.
Reescreva a biografia a seguir de maneira muito profissional, persuasiva e atraente para clientes, destacando qualidade, confiabilidade e excelência técnica.
Mantenha o texto conciso (entre 2 e 4 frases no máximo), escrito em primeira ou terceira pessoa de forma adequada e em português do Brasil.
Não adicione aspas ou introduções na resposta, retorne apenas o texto final polido.

Biografia original: "${profileBio}"`
        })
      });

      if (!response.ok) {
        throw new Error("Erro na chamada da API.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.text) {
        setProfileBio(data.text);
      }
      if (data.warning) {
        alert(data.warning);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao melhorar biografia com IA: " + err.message);
    } finally {
      setIsImprovingBio(false);
    }
  };

  // Add gallery image
  const handleAddGalleryImage = async () => {
    if (!professional) return;
    if (!galleryTitle.trim()) {
      alert("Por favor, digite uma legenda para a foto.");
      return;
    }
    if (!galleryFile) {
      alert("Por favor, selecione um arquivo de imagem.");
      return;
    }

    setIsUploadingGallery(true);
    try {
      const base64Img = await optimizeAndToBase64(galleryFile);
      const newPhoto = {
        title: galleryTitle.trim(),
        imageUrl: base64Img
      };

      const updatedGallery = [...(professional.gallery || []), newPhoto];
      await saveProfessionalProfile(professional.id, { gallery: updatedGallery });
      setProfessional({ ...professional, gallery: updatedGallery });
      
      // Clear fields
      setGalleryTitle("");
      setGalleryFile(null);
      
      // Reset input element
      const fileInput = document.getElementById("galleryFile") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      alert("Foto adicionada com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao enviar imagem: " + err.message);
    } finally {
      setIsUploadingGallery(false);
    }
  };

  // Remove gallery image
  const handleRemoveGalleryImage = async (indexToRemove: number) => {
    if (!professional) return;
    if (!confirm("Tem certeza que deseja remover esta foto do portfólio?")) return;

    try {
      const updatedGallery = (professional.gallery || []).filter((_: any, idx: number) => idx !== indexToRemove);
      await saveProfessionalProfile(professional.id, { gallery: updatedGallery });
      setProfessional({ ...professional, gallery: updatedGallery });
      alert("Foto removida com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao remover foto: " + err.message);
    }
  };

  // Update Lead Status
  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    const updated = leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
    setLeads(updated);
    if (professional) {
      await updateLeadStatus(professional.id, leadId, newStatus);
    }
  };

  // Generate AI Description
  const handleGenerateAIDesc = async () => {
    if (!newServiceName.trim()) {
      alert("Por favor, preencha o nome do serviço primeiro para a IA entender o que escrever.");
      return;
    }
    
    setIsGeneratingDesc(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "service",
          prompt: {
            name: newServiceName,
            price: newServicePrice,
            unit: newServiceUnit,
            userNotes: newServiceDesc
          }
        })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setNewServiceDesc(data.text);
      if (data.warning) {
        alert(data.warning);
      }
    } catch (err: any) {
      console.error(err);
      alert("Não foi possível gerar a descrição com a IA: " + err.message);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // Add Service to Catalog
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const newService: Service = {
      id: "service_" + Date.now(),
      name: newServiceName,
      price: newServicePrice,
      unit: newServiceUnit,
      description: newServiceDesc
    };
    const updated = [...services, newService];
    setServices(updated);
    if (professional) {
      await saveService(professional.id, newService);
    }

    // Reset Form
    setNewServiceName("");
    setNewServicePrice(0);
    setNewServiceUnit("m²");
    setNewServiceDesc("");
    setIsAddServiceOpen(false);
  };

  // Delete Service
  const handleDeleteService = async (id: string) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    if (professional) {
      await deleteService(professional.id, id);
    }
  };

  // Budget Items Management
  const handleAddItemRow = () => {
    setEstimateItems([
      ...estimateItems,
      { id: "item_" + Date.now(), name: "", quantity: 1, price: 0 }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (estimateItems.length === 1) return;
    setEstimateItems(estimateItems.filter(item => item.id !== id));
  };

  const handleItemSelect = (id: string, serviceId: string) => {
    const matchedService = services.find(s => s.id === serviceId);
    if (!matchedService) return;

    setEstimateItems(
      estimateItems.map(item => 
        item.id === id 
          ? { ...item, name: matchedService.name, price: matchedService.price } 
          : item
      )
    );
  };

  const handleItemChange = (id: string, field: "name" | "quantity" | "price", value: any) => {
    setEstimateItems(
      estimateItems.map(item => 
        item.id === id 
          ? { ...item, [field]: value } 
          : item
      )
    );
  };

  // Budget Calculations
  const activeItems = estimateItems.filter(item => item.name.trim() !== "" || item.price > 0);
  const subtotal = activeItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  // Generate Backend PDF
  const handleGeneratePdf = async () => {
    if (!clientName.trim()) {
      alert("Por favor, preencha o nome do cliente.");
      return;
    }
    
    // Check if items are complete
    if (activeItems.length === 0) {
      alert("Por favor, adicione pelo menos um item ao orçamento.");
      return;
    }

    const invalidItems = activeItems.some(i => !i.name.trim() || i.price <= 0);
    if (invalidItems) {
      alert("Por favor, certifique-se de que todos os itens têm nome e preço válido.");
      return;
    }

    if (!professional) return;

    setIsGeneratingPdf(true);

    let signatureBase64 = "";
    if (estimateCanvasRef.current) {
      const canvas = estimateCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const isBlank = !buffer.some(channel => channel !== 0);
        if (!isBlank) {
          signatureBase64 = canvas.toDataURL("image/png");
        }
      }
    }

    const pdfPayload = {
      theme: estimateTheme,
      signatureBase64,
      professional: {
        name: professional.name,
        title: professional.title,
        category: professional.category,
        city: professional.city,
        phone: professional.whatsapp,
        logoUrl: professional.logoUrl || "",
        pixKey: professional.pixKey || ""
      },
      client: {
        name: clientName,
        phone: clientPhone,
        date: estimateDate,
        validityDays: validityDays,
        notes: estimateNotes
      },
      items: activeItems.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price
      })),
      subtotal,
      discount,
      total
    };

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload)
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar PDF.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      const cleanName = clientName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.download = `orcamento_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Save estimate record in database
      const newEstimate: Estimate = {
        id: "est_" + Date.now(),
        clientName: clientName,
        clientPhone: clientPhone,
        date: estimateDate,
        validityDays: validityDays,
        notes: estimateNotes,
        items: activeItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        subtotal,
        discount,
        total,
        status: "pendente",
        createdAt: new Date().toISOString()
      };

      await saveEstimate(professional.id, newEstimate);
      setEstimates(prev => [newEstimate, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao gerar o PDF do orçamento.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Update estimate status
  const handleEstimateStatusChange = async (estimateId: string, status: Estimate["status"]) => {
    if (!professional) return;
    setEstimates(
      estimates.map(est => est.id === estimateId ? { ...est, status } : est)
    );
    await updateEstimateStatus(professional.id, estimateId, status);
  };

  // Delete estimate
  const handleDeleteEstimate = async (estimateId: string) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento permanentemente?")) return;
    if (!professional) return;
    setEstimates(estimates.filter(est => est.id !== estimateId));
    await deleteEstimate(professional.id, estimateId);
  };

  // Use estimate as template (prefill form)
  const handleUseEstimateAsTemplate = (est: Estimate) => {
    setClientName(est.clientName);
    setClientPhone(est.clientPhone || "");
    setEstimateDate(est.date);
    setValidityDays(est.validityDays);
    setEstimateNotes(est.notes || "");
    setDiscount(est.discount || 0);
    
    // map items
    setEstimateItems(
      est.items.map((item, idx) => ({
        id: "item_" + Date.now() + "_" + idx,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    );
    
    setOrcadorSubTab("emitir");
    alert("Dados do orçamento carregados no formulário!");
  };

  // Generate Receipt PDF
  const handleGenerateRecibo = async () => {
    if (!reciboClientName.trim()) {
      alert("Por favor, preencha o nome do cliente.");
      return;
    }
    if (reciboValue <= 0) {
      alert("Por favor, preencha um valor válido (maior que zero) para o recibo.");
      return;
    }
    if (!reciboReferente.trim()) {
      alert("Por favor, preencha o campo 'Referente a'.");
      return;
    }
    if (!professional) return;

    setIsGeneratingRecibo(true);

    let signatureBase64 = "";
    if (receiptCanvasRef.current) {
      const canvas = receiptCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const isBlank = !buffer.some(channel => channel !== 0);
        if (!isBlank) {
          signatureBase64 = canvas.toDataURL("image/png");
        }
      }
    }

    const payload = {
      theme: receiptTheme,
      signatureBase64,
      professional: {
        name: professional.name,
        title: professional.title,
        category: professional.category,
        city: professional.city,
        phone: professional.whatsapp,
        logoUrl: professional.logoUrl || "",
        pixKey: professional.pixKey || ""
      },
      clientName: reciboClientName,
      value: reciboValue,
      referente: reciboReferente,
      date: reciboDate
    };

    try {
      const response = await fetch("/api/recibo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar recibo.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      const cleanName = reciboClientName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.download = `recibo_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Save receipt to database
      const newReceipt: Receipt = {
        id: "rec_" + Date.now(),
        clientName: reciboClientName,
        value: reciboValue,
        referente: reciboReferente,
        date: reciboDate,
        createdAt: new Date().toISOString()
      };

      await saveReceipt(professional.id, newReceipt);
      setReceipts(prev => [newReceipt, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao gerar o PDF do recibo.");
    } finally {
      setIsGeneratingRecibo(false);
    }
  };

  // Delete Receipt
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm("Tem certeza que deseja excluir este recibo permanentemente?")) return;
    if (!professional) return;
    setReceipts(receipts.filter(r => r.id !== receiptId));
    await deleteReceipt(professional.id, receiptId);
  };

  // Use Receipt as Template (prefill form)
  const handleUseReceiptAsTemplate = (receipt: Receipt) => {
    setReciboClientName(receipt.clientName);
    setReciboValue(receipt.value);
    setReciboReferente(receipt.referente);
    setReciboDate(receipt.date);
    setReceiptSubTab("emitir");
    alert("Dados do recibo carregados no formulário!");
  };

  // State to track which contract is generating
  const [isGeneratingContractId, setIsGeneratingContractId] = useState<string | null>(null);

  // Generate Contract PDF from Estimate
  const handleGenerateContract = (estimate: Estimate) => {
    if (!professional) return;
    setActiveEstimateForContract(estimate);
    setIsContractSigOpen(true);
  };

  const handleConfirmGenerateContract = async () => {
    if (!professional || !activeEstimateForContract) return;
    
    setIsGeneratingContractId(activeEstimateForContract.id);
    setIsContractSigOpen(false);

    let signatureBase64 = "";
    if (contractModalCanvasRef.current) {
      const canvas = contractModalCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const isBlank = !buffer.some(channel => channel !== 0);
        if (!isBlank) {
          signatureBase64 = canvas.toDataURL("image/png");
        }
      }
    }

    try {
      const payload = {
        theme: contractTheme,
        signatureBase64,
        professional: {
          name: professional.name,
          title: professional.title,
          category: professional.category,
          city: professional.city,
          phone: professional.whatsapp
        },
        client: {
          name: activeEstimateForContract.clientName,
          phone: activeEstimateForContract.clientPhone,
          date: activeEstimateForContract.date.split("T")[0],
          validityDays: activeEstimateForContract.validityDays,
          notes: activeEstimateForContract.notes
        },
        items: activeEstimateForContract.items,
        discount: activeEstimateForContract.discount,
        subtotal: activeEstimateForContract.subtotal,
        total: activeEstimateForContract.total
      };

      const response = await fetch("/api/contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Erro ao gerar contrato");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanName = activeEstimateForContract.clientName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.download = `contrato_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating contract:", err);
      alert("Ocorreu um erro ao gerar o PDF do contrato de prestação de serviços.");
    } finally {
      setIsGeneratingContractId(null);
      setActiveEstimateForContract(null);
    }
  };

  // Appointment Handlers
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;
    if (!apptTitle.trim()) {
      alert("Por favor, informe o título/serviço.");
      return;
    }
    if (!apptClientName.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }
    if (!apptDate) {
      alert("Por favor, selecione uma data.");
      return;
    }

    setIsSavingAppt(true);
    try {
      const newAppt: Appointment = {
        id: "appt_" + Date.now(),
        title: apptTitle.trim(),
        clientName: apptClientName.trim(),
        date: apptDate,
        time: apptTime || undefined,
        notes: apptNotes.trim() || undefined,
        status: "agendado",
        createdAt: new Date().toISOString()
      };

      await saveAppointment(professional.id, newAppt);
      setAppointments([newAppt, ...appointments]);
      
      // Clear fields
      setApptTitle("");
      setApptClientName("");
      setApptDate("");
      setApptTime("");
      setApptNotes("");
    } catch (err) {
      console.error("Error saving appointment:", err);
      alert("Erro ao salvar agendamento.");
    } finally {
      setIsSavingAppt(false);
    }
  };

  const handleDeleteAppointment = async (apptId: string) => {
    if (!professional) return;
    if (!confirm("Tem certeza que deseja remover este agendamento?")) return;

    try {
      await deleteAppointment(professional.id, apptId);
      setAppointments(appointments.filter(a => a.id !== apptId));
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert("Erro ao remover agendamento.");
    }
  };

  const handleUpdateAppointmentStatus = async (appt: Appointment, newStatus: Appointment["status"]) => {
    if (!professional) return;
    try {
      const updatedAppt = { ...appt, status: newStatus };
      await saveAppointment(professional.id, updatedAppt);
      setAppointments(appointments.map(a => a.id === appt.id ? updatedAppt : a));
    } catch (err) {
      console.error("Error updating appointment status:", err);
    }
  };

  // Product Handlers
  const handleProductPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingProductPhoto(true);
    try {
      const newUrls = [...newProductImageUrls];
      for (let i = 0; i < files.length; i++) {
        const base64 = await optimizeAndToBase64(files[i]);
        newUrls.push(base64);
      }
      setNewProductImageUrls(newUrls);
    } catch (err) {
      console.error("Error optimizing product photo:", err);
      alert("Erro ao carregar e otimizar fotos.");
    } finally {
      setIsUploadingProductPhoto(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;
    if (!newProductName.trim()) {
      alert("Por favor, informe o nome do produto.");
      return;
    }
    if (newProductPrice <= 0) {
      alert("Por favor, informe um preço válido.");
      return;
    }

    try {
      const prodId = editingProduct ? editingProduct.id : "prod_" + Date.now();
      const newProd: Product = {
        id: prodId,
        name: newProductName.trim(),
        price: newProductPrice,
        description: newProductDesc.trim(),
        imageColor: newProductColor,
        status: newProductStatus,
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
        condition: newProductCondition,
        category: newProductCategory,
        location: newProductLocation.trim() || undefined,
        imageUrl: newProductImageUrls[0] || undefined,
        imageUrls: newProductImageUrls.length > 0 ? newProductImageUrls : undefined
      };

      await saveProduct(professional.id, newProd);
      
      if (editingProduct) {
        setProducts(products.map(p => p.id === prodId ? newProd : p));
      } else {
        setProducts([newProd, ...products]);
      }

      // Clear fields and modal
      setNewProductName("");
      setNewProductPrice(0);
      setNewProductDesc("");
      setNewProductStatus("ativo");
      setNewProductCondition("novo");
      setNewProductCategory("outros");
      setNewProductLocation("");
      setNewProductImageUrls([]);
      setEditingProduct(null);
      setIsAddProductOpen(false);
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Erro ao salvar produto.");
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!professional) return;
    if (!confirm("Tem certeza que deseja remover este produto?")) return;

    try {
      await deleteProduct(professional.id, prodId);
      setProducts(products.filter(p => p.id !== prodId));
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Erro ao excluir produto.");
    }
  };

  // AI Insights Handler
  const handleGenerateAiInsight = async (force = false) => {
    if (!professional) return;
    if (aiInsight && !force) return; // already loaded

    setIsGeneratingInsight(true);
    try {
      // Calculate totals
      const faturamento = receipts.reduce((acc, r) => acc + r.value, 0);
      const despesas = expenses.reduce((acc, r) => acc + r.value, 0);
      const orcamentosPendentes = estimates.filter(e => e.status === "pendente").length;
      const leadsRecebidos = leads.length;

      const prompt = `Você é um assistente de negócios inteligente da plataforma Central do Autônomo.
Analise os seguintes dados do profissional autônomo ${professional.name}:
- Faturamento do mês (Recibos emitidos): R$ ${faturamento}
- Despesas lançadas: R$ ${despesas}
- Orçamentos Pendentes no histórico: ${orcamentosPendentes}
- Leads (Novos Contatos) no painel: ${leadsRecebidos}

Gere um conselho curto, extremamente prático e motivador em português (máximo 2 frases) para ajudar o profissional a aumentar seu faturamento ou reduzir despesas. Mantenha o texto limpo, direto ao ponto e amigável. Não use introduções ou aspas.`;

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "custom", prompt })
      });

      const data = await response.json();
      if (data.text) {
        setAiInsight(data.text);
      } else {
        setAiInsight("Dica: Mantenha seus contatos atualizados e use a aba Leads para captar novos clientes regularmente!");
      }
    } catch (err) {
      console.error("Error generating AI insights:", err);
      setAiInsight("Dica: Use o Assistente de Cobrança no WhatsApp para enviar lembretes aos clientes com orçamentos pendentes.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  // Generate AI insight when activeTab shifts to "inicio"
  useEffect(() => {
    if (activeTab === "inicio" && professional) {
      handleGenerateAiInsight();
    }
  }, [activeTab, professional, receipts, expenses, estimates, leads]);

  // Generate QrCode for the interactive card when it opens
  useEffect(() => {
    if (isDigitalCardOpen && professional) {
      const profileUrl = typeof window !== "undefined"
        ? `${window.location.origin}/${professional.username}`
        : `https://central.me/${professional.username}`;
        
      QRCode.toDataURL(profileUrl, { width: 250, margin: 1 })
        .then(url => setProfileQrCodeUrl(url))
        .catch(err => console.error("Error generating profile QR code:", err));
        
      if (professional.pixKey) {
        // A simple Pix BR Code
        const pixPayload = `00020101021126330014br.gov.bcb.pix0111${professional.pixKey}5204000053039865802BR5913${professional.name.substring(0, 13).normalize("NFD").replace(/[\u0300-\u036f]/g, "")}6009SAO PAULO62070503***6304`;
        QRCode.toDataURL(pixPayload, { width: 250, margin: 1 })
          .then(url => setPixQrCodeUrl(url))
          .catch(err => console.error("Error generating Pix QR code:", err));
      }
    }
  }, [isDigitalCardOpen, professional]);

  const handleGenerateCardDesign = async () => {
    if (!professional) return;
    setIsGeneratingCardDesign(true);

    const userPrompt = aiCardPrompt.trim();
    const systemPrompt = `Você é um designer gráfico especializado em cartões de visita de luxo e identidade corporativa no Brasil.
Seu objetivo é analisar as informações do profissional e gerar uma folha de estilo de design em formato JSON estruturado.
Profissional:
- Nome: "${professional.name}"
- Especialidade: "${professional.title}"
- Categoria: "${professional.category}"
- Biografia: "${professional.bio}"

Estilo solicitado pelo usuário: "${userPrompt || "um design sofisticado, moderno e profissional adequado para esta categoria"}"

Retorne APENAS um JSON plano com os seguintes campos (sem formatação markdown, sem blocos de código \`\`\`, apenas o texto JSON bruto contendo aspas duplas):
{
  "bg": "um gradiente CSS premium (ex: linear-gradient(135deg, #111827 0%, #1f2937 100%) ou linear-gradient(135deg, oklch(35% 0.12 280), oklch(20% 0.08 280)) ou tons luxuosos combinando com a profissão)",
  "textColor": "cor hexadecimal ou oklch para contraste de leitura excelente sobre o fundo (geralmente #ffffff)",
  "accentColor": "cor de destaque em tom contrastante (ex: ouro, amarelo, verde neon, cyan, roxo claro - ex: #fbbf24 ou #34d399)",
  "patternType": "escolha um padrão entre 'mesh', 'glass', 'geometric' ou 'minimalist'",
  "badgeBg": "cor de fundo semi-transparente para as tags de contato (ex: rgba(255,255,255,0.08) ou rgba(0,0,0,0.2))"
}`;

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemPrompt, type: "card_design" })
      });

      if (!response.ok) {
        throw new Error("Erro na chamada de IA");
      }

      const data = await response.json();
      const text = data.text || "";

      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);
      if (parsed.bg && parsed.textColor && parsed.accentColor) {
        const newDesign = {
          bg: parsed.bg,
          textColor: parsed.textColor,
          accentColor: parsed.accentColor,
          patternType: parsed.patternType || "minimalist",
          badgeBg: parsed.badgeBg || "rgba(255,255,255,0.1)"
        };

        const updatedProf = { ...professional, cardDesign: newDesign };
        setProfessional(updatedProf);
        await saveProfessionalProfile(professional.id, { cardDesign: newDesign });
        
        alert("Novo design de cartão de visitas gerado pela Inteligência Artificial!");
      } else {
        throw new Error("JSON incompleto");
      }
    } catch (err) {
      console.error("Erro ao gerar design do cartão com IA:", err);
      
      const presets: Record<string, any> = {
        "Pintor": {
          bg: "linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))",
          textColor: "#ffffff",
          accentColor: "#f39c12",
          patternType: "mesh",
          badgeBg: "rgba(255, 255, 255, 0.15)"
        },
        "Eletricista": {
          bg: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
          textColor: "#ffffff",
          accentColor: "#fbbf24",
          patternType: "geometric",
          badgeBg: "rgba(251, 191, 36, 0.1)"
        },
        "Encanador": {
          bg: "linear-gradient(135deg, #0f172a 0%, #0369a1 100%)",
          textColor: "#ffffff",
          accentColor: "#38bdf8",
          patternType: "mesh",
          badgeBg: "rgba(255, 255, 255, 0.08)"
        },
        "Manicure": {
          bg: "linear-gradient(135deg, #fbcfe8 0%, #db2777 100%)",
          textColor: "#ffffff",
          accentColor: "#fdf2f8",
          patternType: "glass",
          badgeBg: "rgba(255, 255, 255, 0.2)"
        },
        "default": {
          bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          textColor: "#ffffff",
          accentColor: "var(--primary)",
          patternType: "glass",
          badgeBg: "rgba(255, 255, 255, 0.1)"
        }
      };

      const preset = presets[professional.category] || presets.default;
      const updatedProf = { ...professional, cardDesign: preset };
      setProfessional(updatedProf);
      await saveProfessionalProfile(professional.id, { cardDesign: preset });
      alert("Design gerado com sucesso usando a inteligência de categoria (Fallback)!");
    } finally {
      setIsGeneratingCardDesign(false);
    }
  };

  // Billing Copilot Handlers
  const handleOpenBillingModal = (est: Estimate) => {
    setBillingEstimate(est);
    setIsBillingModalOpen(true);
    
    // Compile initial friendly message
    const friendlyMsg = `Olá, ${est.clientName}! Tudo bem? Gostaria de saber se você teve a oportunidade de dar uma olhada no orçamento para "${est.items.map(i => i.name).join(", ")}" que te enviei (R$ ${est.total.toFixed(2)}). Se tiver qualquer dúvida ou precisar ajustar alguma coisa, é só me falar! Abraço.`;
    setBillingMessage(friendlyMsg);
    setBillingTone("amigavel");
  };

  const handleBillingToneChange = (tone: "amigavel" | "formal" | "firme") => {
    setBillingTone(tone);
    if (!billingEstimate) return;
    
    const est = billingEstimate;
    const itemsText = est.items.map(i => i.name).join(", ");
    let msg = "";
    
    if (tone === "amigavel") {
      msg = `Olá, ${est.clientName}! Tudo bem? Gostaria de saber se você teve a oportunidade de dar uma olhada no orçamento para "${itemsText}" que te enviei (R$ ${est.total.toFixed(2)}). Se tiver qualquer dúvida ou precisar ajustar alguma coisa, é só me falar! Abraço.`;
    } else if (tone === "formal") {
      msg = `Prezado(a) ${est.clientName}, espero que esta mensagem o(a) encontre bem. Escrevo para dar seguimento ao orçamento elaborado para "${itemsText}" no valor total de R$ ${est.total.toFixed(2)}. Gostaria de confirmar o recebimento e verificar se há interesse no prosseguimento do serviço. Permaneço à disposição. Atenciosamente, ${professional?.name || "Prestador"}.`;
    } else if (tone === "firme") {
      const pixInfo = professional?.pixKey ? `\n\nChave Pix para sinal:\nTipo: ${professional.pixKeyType?.toUpperCase()}\nChave: ${professional.pixKey}` : "";
      msg = `Olá, ${est.clientName}. Gostaria de confirmar a aprovação do orçamento referente a "${itemsText}" no valor de R$ ${est.total.toFixed(2)}. Para iniciarmos o agendamento e a preparação dos serviços, precisamos confirmar a contratação.${pixInfo}\n\nObrigado!`;
    }
    
    setBillingMessage(msg);
  };

  const handleImproveBillingMessageWithAI = async () => {
    if (!billingMessage.trim()) return;
    
    setIsGeneratingBillingMessage(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          prompt: `Você é um assistente de negócios especializado em comunicação de cobrança por WhatsApp.
Reescreva a mensagem a seguir de forma extremamente profissional, simpática e natural, sem alterar os valores monetários, nomes de clientes e dados de Pix.
A mensagem deve ser perfeita para ser enviada diretamente no WhatsApp. Não adicione aspas nem introduções, responda apenas com o texto final.

Mensagem atual: "${billingMessage}"`
        })
      });
      
      const data = await response.json();
      if (data.text) {
        setBillingMessage(data.text);
      }
    } catch (err) {
      console.error("Error rephrasing billing message:", err);
      alert("Não foi possível refrasear a mensagem no momento.");
    } finally {
      setIsGeneratingBillingMessage(false);
    }
  };

  // Expense Handlers
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;
    if (!expenseDesc.trim()) {
      alert("Por favor, digite uma descrição para a despesa.");
      return;
    }
    if (expenseValue <= 0) {
      alert("Por favor, digite um valor válido para a despesa.");
      return;
    }
    if (!expenseDate) {
      alert("Por favor, selecione a data do lançamento.");
      return;
    }

    setIsSavingExpense(true);
    try {
      const newExpense: Expense = {
        id: "exp_" + Date.now(),
        description: expenseDesc.trim(),
        category: expenseCategory,
        value: expenseValue,
        date: expenseDate,
        createdAt: new Date().toISOString()
      };

      await saveExpense(professional.id, newExpense);
      setExpenses(prev => [newExpense, ...prev]);
      
      // Reset form fields
      setExpenseDesc("");
      setExpenseValue(0);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar despesa.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento financeiro?")) return;
    if (!professional) return;
    setExpenses(expenses.filter(e => e.id !== expenseId));
    await deleteExpense(professional.id, expenseId);
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: "1rem" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid var(--border-color)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ color: "var(--foreground-muted)", fontWeight: 500 }}>Carregando painel...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user || !professional) {
    return (
      <div className={styles.authContainer}>
        <div className={`${styles.authCard} ${!isLoginMode ? styles.authCardSignUp : ""}`}>
          <h2 className={`${styles.authTitle} text-gradient`}>
            {isLoginMode ? "Acessar Painel" : "Criar Minha Conta"}
          </h2>
          <p className={styles.authSubtitle}>
            {isLoginMode 
              ? "Gerencie seus serviços, crie orçamentos em PDF e veja seus contatos." 
              : "Cadastre-se para ter seu link público de portfólio no ar gratuitamente!"}
          </p>

          {!isFirebaseConfigured && (
            <div className={styles.authInfo}>
              ℹ️ Modo Desenvolvimento Offline ativo. Qualquer e-mail/senha será simulado.
            </div>
          )}

          {authError && <div className={styles.authError}>{authError}</div>}

          {isLoginMode ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.formGroup}>
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className={styles.inputField}
                />
              </div>

              <button type="submit" className="btn-glow" style={{ padding: "0.8rem", borderRadius: "10px", fontWeight: 700, marginTop: "1rem" }}>
                Entrar no Painel
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.authGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@dominio.com"
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="password">Senha</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.authGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Nome Completo</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="title">Título do Perfil</label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    placeholder="Ex: Eletricista Residencial e NR10"
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.authGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="category">Categoria</label>
                  <select
                    id="category"
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className={styles.selectField}
                  >
                    {PROFESSIONAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="outro">Outro (Digitar...)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="city">Cidade e Estado</label>
                  <input
                    id="city"
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                    className={styles.inputField}
                  />
                </div>
              </div>

              {regCategory === "outro" && (
                <div className={styles.authGrid} style={{ gridTemplateColumns: "1fr" }}>
                  <div className={styles.formGroup}>
                    <label htmlFor="customCategory">Digite sua Categoria / Profissão</label>
                    <input
                      id="customCategory"
                      type="text"
                      required
                      value={customCategoryText}
                      onChange={(e) => setCustomCategoryText(e.target.value)}
                      placeholder="Ex: Personal Trainer, Costureira, Aero-Fotografia..."
                      className={styles.inputField}
                    />
                  </div>
                </div>
              )}

              <div className={styles.authGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="whatsapp">WhatsApp (com DDD)</label>
                  <input
                    id="whatsapp"
                    type="text"
                    required
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="username">Link Público Desejado</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>central.me/</span>
                    <input
                      id="username"
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="joao-eletricista"
                      className={styles.inputField}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bio">Sua Biografia / Sobre Você</label>
                <textarea
                  id="bio"
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="Conte um pouco sobre sua experiência, tempo de mercado e diferenciais..."
                  className={styles.textareaField}
                />
              </div>

              <button type="submit" className="btn-glow" style={{ padding: "0.8rem", borderRadius: "10px", fontWeight: 700, marginTop: "1rem" }}>
                Criar Minha Conta e Perfil
              </button>
            </form>
          )}

          <p className={styles.authToggleText}>
            {isLoginMode ? "Ainda não tem conta?" : "Já possui conta?"}
            <button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAuthError("");
              }}
              className={styles.authToggleBtn}
            >
              {isLoginMode ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateString,
        dayNum: d,
        isToday: dateString === new Date().toISOString().split("T")[0]
      });
    }
    
    return days;
  };

  const getChartData = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const last6Months: { name: string; year: number; monthNum: number; faturamento: number; despesa: number }[] = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        name: months[d.getMonth()],
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        faturamento: 0,
        despesa: 0
      });
    }
    
    receipts.forEach(r => {
      if (!r.date) return;
      const rDate = new Date(r.date + "T00:00:00");
      const match = last6Months.find(m => m.monthNum === rDate.getMonth() && m.year === rDate.getFullYear());
      if (match) {
        match.faturamento += r.value;
      }
    });
    
    expenses.forEach(e => {
      if (!e.date) return;
      const eDate = new Date(e.date + "T00:00:00");
      const match = last6Months.find(m => m.monthNum === eDate.getMonth() && m.year === eDate.getFullYear());
      if (match) {
        match.despesa += e.value;
      }
    });
    
    return last6Months;
  };

  return (
    <>
      {/* Navbar Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.logo}>
            <svg className={styles.logoIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="text-gradient">Painel do Profissional</span>
          </div>
          
          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
            <Link href={`/${professional.username}`} target="_blank" className={styles.backBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
              <span>Ver Meu Perfil</span>
            </Link>
            
            <button onClick={handleSignOut} className={styles.signOutBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className={styles.container} style={{ marginTop: "2.2rem" }}>


      {/* Main Grid */}
      <div className={styles.dashboardGrid}>
        {/* Sidebar Nav */}
        <aside className={styles.sidebar}>
          <button
            onClick={() => setActiveTab("inicio")}
            className={`${styles.sidebarBtn} ${activeTab === "inicio" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Início (Insights)</span>
          </button>

          <button
            onClick={() => setActiveTab("agenda")}
            className={`${styles.sidebarBtn} ${activeTab === "agenda" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Minha Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={`${styles.sidebarBtn} ${activeTab === "leads" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Meus Leads</span>
          </button>

          <button
            onClick={() => setActiveTab("servicos")}
            className={`${styles.sidebarBtn} ${activeTab === "servicos" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>Serviços & Produtos</span>
          </button>

          <button
            onClick={() => setActiveTab("orcador")}
            className={`${styles.sidebarBtn} ${activeTab === "orcador" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Gerador de PDF</span>
          </button>

          <button
            onClick={() => setActiveTab("recibos")}
            className={`${styles.sidebarBtn} ${activeTab === "recibos" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>Gerador de Recibos</span>
          </button>

          <button
            onClick={() => setActiveTab("financas")}
            className={`${styles.sidebarBtn} ${activeTab === "financas" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <span>Relatório Financeiro</span>
          </button>

          <button
            onClick={() => setActiveTab("pagamentos")}
            className={`${styles.sidebarBtn} ${activeTab === "pagamentos" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <span>Pagamentos & Repasses</span>
          </button>

          <button
            onClick={() => setActiveTab("perfil")}
            className={`${styles.sidebarBtn} ${activeTab === "perfil" ? styles.activeTab : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Meu Perfil</span>
          </button>
        </aside>

        {/* Content Panel */}
        <main className={styles.contentCard}>
          {/* TAB 0: INÍCIO (INSIGHTS) */}
          {activeTab === "inicio" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>Painel de Insights & Visão Geral</h2>
                <span className={styles.badge} style={{ borderColor: "var(--primary)" }}>
                  Premium ✨
                </span>
              </div>

              {/* KPIs Grid */}
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <span className={styles.overviewCardLabel}>Faturamento (Mensal)</span>
                  <span className={styles.overviewCardValue}>
                    R$ {receipts.filter(r => r.date && new Date(r.date + "T00:00:00").getMonth() === new Date().getMonth() && new Date(r.date + "T00:00:00").getFullYear() === new Date().getFullYear()).reduce((acc, r) => acc + r.value, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={styles.overviewCardSubtext}>Baseado nos recibos deste mês</span>
                </div>
                
                <div className={styles.overviewCard}>
                  <span className={styles.overviewCardLabel}>Despesas (Mensal)</span>
                  <span className={styles.overviewCardValue}>
                    R$ {expenses.filter(e => e.date && new Date(e.date + "T00:00:00").getMonth() === new Date().getMonth() && new Date(e.date + "T00:00:00").getFullYear() === new Date().getFullYear()).reduce((acc, e) => acc + e.value, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={styles.overviewCardSubtext}>Materiais, combustível, etc.</span>
                </div>

                <div className={styles.overviewCard}>
                  <span className={styles.overviewCardLabel}>Taxa de Fechamento</span>
                  <span className={styles.overviewCardValue}>
                    {leads.length > 0 ? ((leads.filter(l => l.status === "fechado").length / leads.length) * 100).toFixed(0) : "0"}%
                  </span>
                  <span className={styles.overviewCardSubtext}>
                    {leads.filter(l => l.status === "fechado").length} de {leads.length} leads convertidos
                  </span>
                </div>

                <div className={styles.overviewCard}>
                  <span className={styles.overviewCardLabel}>Agendamentos de Hoje</span>
                  <span className={styles.overviewCardValue}>
                    {appointments.filter(a => a.date === new Date().toISOString().split("T")[0] && a.status === "agendado").length}
                  </span>
                  <span className={styles.overviewCardSubtext}>Visitas ou serviços agendados</span>
                </div>
              </div>

              {/* AI Insights Card */}
              <div className={styles.aiInsightCard}>
                <div className={styles.aiInsightTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                  <span>Dica do Assistente de IA</span>
                </div>
                {isGeneratingInsight ? (
                  <div className={styles.aiInsightLoading}>
                    <span className={styles.spinner}></span>
                    <span>Analisando suas finanças...</span>
                  </div>
                ) : (
                  <div>
                    <p className={styles.aiInsightText}>{aiInsight || "Carregando seus insights financeiros..."}</p>
                    <button onClick={() => handleGenerateAiInsight(true)} className={styles.aiButton} style={{ marginTop: "0.8rem", padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                      Recarregar Dica ✨
                    </button>
                  </div>
                )}
              </div>

              {/* Chart Card */}
              <div className={styles.dashboardSection}>
                <h3 className={styles.dashboardSectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                  Comparativo Financeiro (Últimos 6 meses)
                </h3>
                <div className={styles.chartCard}>
                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ backgroundColor: "var(--primary)" }}></span>
                      <span>Faturamento (Recibos)</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ backgroundColor: "oklch(65% 0.18 25)" }}></span>
                      <span>Despesas</span>
                    </div>
                  </div>
                  
                  {/* SVG-driven Bar Chart */}
                  <div style={{ position: "relative", width: "100%", height: "240px" }}>
                    <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="40" y1="40" x2="580" y2="40" stroke="#f0f0f0" strokeWidth="1" />
                      <line x1="40" y1="90" x2="580" y2="90" stroke="#f0f0f0" strokeWidth="1" />
                      <line x1="40" y1="140" x2="580" y2="140" stroke="#f0f0f0" strokeWidth="1" />
                      <line x1="40" y1="190" x2="580" y2="190" stroke="#000000" strokeWidth="1.5" />
                      
                      {(() => {
                        const chartData = getChartData();
                        const maxVal = Math.max(...chartData.map(d => Math.max(d.faturamento, d.despesa, 500)));
                        
                        return chartData.map((d, index) => {
                          const x = 60 + index * 85;
                          const fatHeight = (d.faturamento / maxVal) * 140;
                          const expHeight = (d.despesa / maxVal) * 140;
                          const fatY = 190 - fatHeight;
                          const expY = 190 - expHeight;
                          
                          return (
                            <g key={index}>
                              <rect
                                x={x}
                                y={fatY}
                                width="22"
                                height={Math.max(fatHeight, 2)}
                                rx="5"
                                fill="var(--primary)"
                                style={{ transition: "all 0.6s ease" }}
                              >
                                <title>Faturamento {d.name}: R$ {d.faturamento.toFixed(2)}</title>
                              </rect>
                              
                              <rect
                                x={x + 26}
                                y={expY}
                                width="22"
                                height={Math.max(expHeight, 2)}
                                rx="5"
                                fill="oklch(65% 0.18 25)"
                                style={{ transition: "all 0.6s ease" }}
                              >
                                <title>Despesas {d.name}: R$ {d.despesa.toFixed(2)}</title>
                              </rect>
                              
                              <text
                                x={x + 24}
                                y="212"
                                textAnchor="middle"
                                fill="var(--foreground-muted)"
                                fontSize="12"
                                fontWeight="700"
                              >
                                {d.name}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: AGENDA */}
          {activeTab === "agenda" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>📅 Agenda & Calendário de Serviços</h2>
                <span className={styles.badge} style={{ borderColor: "var(--primary)" }}>
                  Premium ✨
                </span>
              </div>

              <div className={styles.agendaLayout}>
                {/* Calendário Grid */}
                <div>
                  <div className={styles.calendarContainer}>
                    <div className={styles.calendarNav}>
                      <span className={styles.calendarNavTitle}>
                        {currentMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" }).toUpperCase()}
                      </span>
                      <div className={styles.calendarNavBtns}>
                        <button
                          type="button"
                          className={styles.calendarNavBtn}
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        >
                          &lt;
                        </button>
                        <button
                          type="button"
                          className={styles.calendarNavBtn}
                          onClick={() => setCurrentMonth(new Date())}
                        >
                          Hoje
                        </button>
                        <button
                          type="button"
                          className={styles.calendarNavBtn}
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                    <div className={styles.calendarGrid}>
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                        <div key={day} className={styles.weekdayHeader}>
                          {day}
                        </div>
                      ))}

                      {getCalendarDays().map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} className={`${styles.calendarDay} ${styles.calendarDayEmpty}`} />;
                        }

                        const dayAppts = appointments.filter(a => a.date === day.dateString);
                        
                        return (
                          <div
                            key={day.dateString}
                            onClick={() => setApptDate(day.dateString)}
                            className={`${styles.calendarDay} ${day.isToday ? styles.calendarDayToday : ""}`}
                          >
                            <span className={styles.calendarDayNumber}>{day.dayNum}</span>
                            <div className={styles.calendarEventsList}>
                              {dayAppts.slice(0, 2).map(appt => (
                                <div
                                  key={appt.id}
                                  className={`${styles.calendarEventDot} ${appt.status === "concluido" ? styles.calendarEventDotCompleted : ""}`}
                                >
                                  {appt.time ? `${appt.time} ` : ""}{appt.title}
                                </div>
                              ))}
                              {dayAppts.length > 2 && (
                                <div className={styles.calendarEventDot} style={{ background: "none", color: "var(--foreground-muted)", textAlign: "center", fontSize: "0.6rem" }}>
                                  +{dayAppts.length - 2} mais
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of appointments for selected date */}
                  <div className={styles.agendaListCard}>
                    <h3>
                      Compromissos {apptDate ? `em ${new Date(apptDate + "T00:00:00").toLocaleDateString("pt-BR")}` : "deste mês"}
                    </h3>
                    <div style={{ marginTop: "1rem" }}>
                      {(() => {
                        const filtered = apptDate
                          ? appointments.filter(a => a.date === apptDate)
                          : appointments.filter(a => {
                              const aDate = new Date(a.date + "T00:00:00");
                              return aDate.getMonth() === currentMonth.getMonth() && aDate.getFullYear() === currentMonth.getFullYear();
                            });

                        if (filtered.length === 0) {
                          return <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>Nenhum agendamento encontrado.</p>;
                        }

                        return filtered.map(appt => (
                          <div key={appt.id} className={styles.apptItem}>
                            <div className={styles.apptDetails}>
                              <h4>{appt.title} {appt.time && <span style={{ fontWeight: 500, color: "var(--primary)" }}>({appt.time})</span>}</h4>
                              <p>Cliente: <strong>{appt.clientName}</strong></p>
                              {appt.notes && <p style={{ fontSize: "0.75rem", fontStyle: "italic" }}>{appt.notes}</p>}
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              {appt.status === "agendado" ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAppointmentStatus(appt, "concluido")}
                                  className={styles.actionIconBtn}
                                  style={{ color: "oklch(65% 0.15 140)", borderColor: "oklch(85% 0.1 140)", padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 700 }}
                                >
                                  Concluir ✓
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "oklch(65% 0.15 140)", fontWeight: 700, paddingRight: "0.5rem" }}>Concluído ✓</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(appt.id)}
                                className={styles.actionIconBtnDelete}
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Form Agendamento Rápido */}
                <div className={styles.agendaFormCard}>
                  <h3>📅 Agendamento Rápido</h3>
                  <form onSubmit={handleSaveAppointment} className={styles.formGrid} style={{ marginTop: "1rem", gap: "1rem" }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="apptClientName">Nome do Cliente</label>
                      <input
                        id="apptClientName"
                        type="text"
                        required
                        placeholder="Ex: Roberto Silva"
                        value={apptClientName}
                        onChange={(e) => setApptClientName(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="apptTitle">Título do Compromisso / Serviço</label>
                      <input
                        id="apptTitle"
                        type="text"
                        required
                        placeholder="Ex: Visita de Pintura"
                        value={apptTitle}
                        onChange={(e) => setApptTitle(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label htmlFor="apptDate">Data</label>
                        <input
                          id="apptDate"
                          type="date"
                          required
                          value={apptDate}
                          onChange={(e) => setApptDate(e.target.value)}
                          className={styles.inputField}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label htmlFor="apptTime">Hora (Opcional)</label>
                        <input
                          id="apptTime"
                          type="time"
                          value={apptTime}
                          onChange={(e) => setApptTime(e.target.value)}
                          className={styles.inputField}
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="apptNotes">Observações</label>
                      <textarea
                        id="apptNotes"
                        placeholder="Ex: Trazer rolo especial, fita adesiva, etc."
                        value={apptNotes}
                        onChange={(e) => setApptNotes(e.target.value)}
                        className={styles.textareaField}
                        style={{ minHeight: "80px" }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingAppt}
                      className="btn-glow"
                      style={{ padding: "0.8rem", borderRadius: "10px", fontWeight: 700 }}
                    >
                      {isSavingAppt ? "Agendando..." : "Salvar Agendamento 📅"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: LEADS */}
          {activeTab === "leads" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>Leads & Pedidos de Orçamentos</h2>
                <span className={styles.badge} style={{ borderColor: "var(--primary)" }}>
                  {leads.length} Contatos
                </span>
              </div>

              {leads.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Nenhum pedido de orçamento recebido ainda.</p>
                </div>
              ) : (
                <div className={styles.leadsList}>
                  {leads.map((lead) => (
                    <div key={lead.id} className={styles.leadItem}>
                      <div className={styles.leadInfo}>
                        <h4>{lead.clientName}</h4>
                        <div className={styles.leadMeta}>
                          <span>📅 {new Date(lead.createdAt).toLocaleDateString("pt-BR")}</span>
                          <span>🛠️ {lead.serviceName}</span>
                        </div>
                        <p className={styles.leadNotes}>{lead.notes}</p>
                      </div>

                      <div className={styles.leadActions}>
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead["status"])}
                          className={`${styles.statusSelect} ${styles[`status_${lead.status}`]}`}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="orçado">Orçado</option>
                          <option value="fechado">Fechado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setApptClientName(lead.clientName);
                            setApptTitle(`Visita: ${lead.serviceName}`);
                            setApptNotes(`Agendado a partir do Lead. Notas: ${lead.notes}`);
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setApptDate(tomorrow.toISOString().split("T")[0]);
                            setActiveTab("agenda");
                          }}
                          className={styles.actionIconBtn}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", padding: "0.45rem 0.8rem", fontSize: "0.85rem", height: "36px", borderColor: "oklch(85% 0.1 260)", color: "var(--primary)" }}
                        >
                          <span>📅 Agendar</span>
                        </button>

                        <a
                          href={`https://wa.me/${lead.clientPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.whatsappLink}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                          </svg>
                          <span>Falar no Whats</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SERVIÇOS & PRODUTOS */}
          {activeTab === "servicos" && (
            <div>
              <div className={styles.tabTitleRow} style={{ borderBottom: "none", marginBottom: "1rem", paddingBottom: 0 }}>
                <h2>Catálogo de Serviços & Produtos</h2>
                {servicesSubTab === "servicos" ? (
                  <button onClick={() => setIsAddServiceOpen(true)} className="btn-glow">
                    + Adicionar Serviço
                  </button>
                ) : (
                  <button onClick={() => setIsAddProductOpen(true)} className="btn-glow">
                    + Anunciar Produto
                  </button>
                )}
              </div>

              <div className={styles.subTabsContainer}>
                <button
                  onClick={() => setServicesSubTab("servicos")}
                  className={`${styles.subTabBtn} ${servicesSubTab === "servicos" ? styles.subTabBtnActive : ""}`}
                >
                  🛠️ Serviços
                </button>
                <button
                  onClick={() => setServicesSubTab("produtos")}
                  className={`${styles.subTabBtn} ${servicesSubTab === "produtos" ? styles.subTabBtnActive : ""}`}
                >
                  📦 Produtos (Anúncios)
                </button>
              </div>

              {servicesSubTab === "servicos" ? (
                /* Services List */
                services.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Cadastre serviços para que seus clientes vejam os preços e façam pedidos.</p>
                  </div>
                ) : (
                  <div className={styles.servicesGrid}>
                    {services.map((service) => (
                      <div key={service.id} className={styles.serviceCard}>
                        <div>
                          <div className={styles.serviceHeader}>
                            <h3 style={{ fontSize: "1.1rem" }}>{service.name}</h3>
                            <span className={styles.servicePrice}>
                              R$ {service.price.toFixed(2)}
                              <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>/{service.unit}</span>
                            </span>
                          </div>
                          <p style={{ fontSize: "0.9rem", color: "var(--foreground-muted)", lineHeight: "1.4" }}>
                            {service.description}
                          </p>
                        </div>
                        <div className={styles.serviceCardActions}>
                          <button 
                            onClick={() => handleDeleteService(service.id)} 
                            className={styles.deleteBtn}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Products List */
                products.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Anuncie produtos físicos, materiais sobressalentes ou ferramentas que você vende.</p>
                  </div>
                ) : (
                  <div className={styles.servicesGrid}>
                    {products.map((prod) => (
                      <div key={prod.id} className={styles.serviceCard}>
                        <div style={{ display: "flex", gap: "1rem" }}>
                          <div
                            style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "10px",
                              background: prod.imageColor || "var(--primary-glow)",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              fontSize: "1.5rem",
                              fontWeight: 800,
                              overflow: "hidden",
                              border: "1px solid var(--border-color)"
                            }}
                          >
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              "📦"
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className={styles.serviceHeader}>
                              <h3 style={{ fontSize: "1.1rem" }}>{prod.name}</h3>
                              <span className={styles.servicePrice}>
                                R$ {prod.price.toFixed(2)}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", margin: "4px 0" }}>
                              Status: <strong style={{ color: prod.status === "ativo" ? "var(--success)" : "var(--error)" }}>
                                {prod.status === "ativo" ? "Ativo (Anunciado)" : "Esgotado"}
                              </strong>
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "6px 0" }}>
                              {prod.condition && (
                                <span style={{ fontSize: "0.7rem", background: "rgba(var(--primary-rgb), 0.15)", color: "var(--primary)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  ✨ {conditionLabels[prod.condition] || prod.condition}
                                </span>
                              )}
                              {prod.category && (
                                <span style={{ fontSize: "0.7rem", background: "var(--border-color)", color: "var(--foreground-muted)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  📁 {categoryLabels[prod.category] || prod.category}
                                </span>
                              )}
                              {prod.location && (
                                <span style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.2)", color: "var(--foreground-muted)", padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                  📍 {prod.location}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", lineHeight: "1.4" }}>
                              {prod.description}
                            </p>
                          </div>
                        </div>
                        <div className={styles.serviceCardActions} style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setNewProductName(prod.name);
                              setNewProductPrice(prod.price);
                              setNewProductDesc(prod.description);
                              setNewProductStatus(prod.status);
                              setNewProductColor(prod.imageColor || "");
                              setNewProductCondition(prod.condition || "novo");
                              setNewProductCategory(prod.category || "outros");
                              setNewProductLocation(prod.location || "");
                              setNewProductImageUrls(prod.imageUrls || (prod.imageUrl ? [prod.imageUrl] : []));
                              setIsAddProductOpen(true);
                            }}
                            className={styles.actionIconBtn}
                            style={{ padding: "4px 8px", fontSize: "0.75rem", fontWeight: 700 }}
                          >
                            Editar
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)} 
                            className={styles.deleteBtn}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: ORÇADOR (GERADOR DE PDF) */}
          {activeTab === "orcador" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>Orçamentos & Finanças</h2>
                <div className={styles.subTabsContainer} style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                  <button
                    onClick={() => setOrcadorSubTab("emitir")}
                    className={`${styles.subTabBtn} ${orcadorSubTab === "emitir" ? styles.subTabBtnActive : ""}`}
                  >
                    Emitir Orçamento
                  </button>
                  <button
                    onClick={() => setOrcadorSubTab("historico")}
                    className={`${styles.subTabBtn} ${orcadorSubTab === "historico" ? styles.subTabBtnActive : ""}`}
                  >
                    Histórico & Finanças
                  </button>
                </div>
              </div>

              {orcadorSubTab === "emitir" ? (
                <div>
                  {/* Client & Metadata Info */}
                  <div className={styles.formGrid}>
                    <div className={styles.formSection}>
                      <h3>Dados do Cliente</h3>
                      <div className={styles.formGroup}>
                        <label htmlFor="cliName">Nome do Cliente</label>
                        <input
                          id="cliName"
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex: Clara Mendes"
                          className={styles.inputField}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="cliPhone">WhatsApp do Cliente</label>
                        <input
                          id="cliPhone"
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Ex: (11) 98888-8888"
                          className={styles.inputField}
                        />
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <h3>Dados Adicionais</h3>
                      <div className={styles.formGroup}>
                        <label htmlFor="estDate">Data do Orçamento</label>
                        <input
                          id="estDate"
                          type="date"
                          value={estimateDate}
                          onChange={(e) => setEstimateDate(e.target.value)}
                          className={styles.inputField}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="valDays">Validade da Proposta (Dias)</label>
                        <input
                          id="valDays"
                          type="number"
                          value={validityDays}
                          onChange={(e) => setValidityDays(parseInt(e.target.value) || 0)}
                          className={styles.inputField}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className={styles.itemsSection}>
                    <h3>Itens / Serviços Incluídos</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      {estimateItems.map((item, index) => (
                        <div key={item.id} className={styles.itemRow}>
                          {/* Name of item / service selection */}
                          <div>
                            <select
                              onChange={(e) => {
                                if (e.target.value === "custom") {
                                  handleItemChange(item.id, "name", "");
                                  handleItemChange(item.id, "price", 0);
                                } else {
                                  handleItemSelect(item.id, e.target.value);
                                }
                              }}
                              className={styles.selectField}
                              defaultValue=""
                            >
                              <option value="" disabled>-- Selecionar do catálogo ou Customizar --</option>
                              <option value="custom">✍️ Digitar Serviço Customizado</option>
                              {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                              placeholder="Descrição do serviço executado"
                              className={styles.inputField}
                              style={{ marginTop: "0.4rem" }}
                            />
                          </div>

                          {/* Quantity */}
                          <div className={styles.formGroup}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 1)}
                              placeholder="Qtd"
                              className={styles.inputField}
                            />
                          </div>

                          {/* Price */}
                          <div className={styles.formGroup}>
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleItemChange(item.id, "price", parseFloat(e.target.value) || 0)}
                              placeholder="Valor unitário"
                              className={styles.inputField}
                            />
                          </div>

                          {/* Remove row button */}
                          <div>
                            <button
                              onClick={() => handleRemoveItemRow(item.id)}
                              className={styles.closeBtn}
                              disabled={estimateItems.length === 1}
                              style={{ opacity: estimateItems.length === 1 ? 0.3 : 1 }}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.addItemRow}>
                      <button onClick={handleAddItemRow} className={styles.btnText}>
                        <span>+ Adicionar Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom notes & Discount */}
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="estNotes">Observações / Termos (aparecem no PDF)</label>
                      <textarea
                        id="estNotes"
                        value={estimateNotes}
                        onChange={(e) => setEstimateNotes(e.target.value)}
                        placeholder="Ex: Formas de pagamento: 50% de sinal e 50% na entrega. Prazo de entrega: 5 dias úteis."
                        className={styles.textareaField}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="estDiscount">Aplicar Desconto (R$)</label>
                      <input
                        id="estDiscount"
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 50"
                        className={styles.inputField}
                      />
                    </div>
                  </div>

                  <div className={styles.formSection} style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px' }}>
                    <h3>Configuração & Assinatura do Orçamento</h3>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label htmlFor="estimateTheme">Tema do Documento</label>
                        <select
                          id="estimateTheme"
                          value={estimateTheme}
                          onChange={(e) => setEstimateTheme(e.target.value)}
                          className={styles.selectField}
                        >
                          <option value="modern">Moderno (Verde Esmeralda / Navy)</option>
                          <option value="classic">Clássico (Azul Royal)</option>
                          <option value="minimalist">Minimalista (Preto / Branco)</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Assinatura Digital (Opcional)</label>
                        <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
                          <canvas
                            ref={estimateCanvasRef}
                            width={400}
                            height={120}
                            onMouseDown={(e) => handleStartDrawing(e, estimateCanvasRef)}
                            onMouseMove={(e) => handleDraw(e, estimateCanvasRef)}
                            onMouseUp={handleStopDrawing}
                            onMouseLeave={handleStopDrawing}
                            onTouchStart={(e) => handleStartDrawing(e, estimateCanvasRef)}
                            onTouchMove={(e) => handleDraw(e, estimateCanvasRef)}
                            onTouchEnd={handleStopDrawing}
                            style={{
                              border: "2px dashed var(--border-color)",
                              borderRadius: "12px",
                              background: "#f8fafc",
                              cursor: "crosshair",
                              width: "100%",
                              height: "120px",
                              touchAction: "none"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => clearCanvas(estimateCanvasRef)}
                            className={styles.closeBtn}
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "var(--background-soft)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              color: "var(--foreground-muted)"
                            }}
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Totals Summary & Submit Button */}
                  <div className={styles.summaryBlock}>
                    <div className={styles.summaryContent}>
                      <div className={styles.summaryRow}>
                        <span>Subtotal:</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      <div className={styles.summaryRow} style={{ color: "var(--error)" }}>
                        <span>Desconto:</span>
                        <span>- R$ {discount.toFixed(2)}</span>
                      </div>
                      <div className={styles.summaryTotal}>
                        <span>Total Geral:</span>
                        <span>R$ {total.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        className={`${styles.btnGenerate} btn-glow`}
                      >
                        {isGeneratingPdf ? "Gerando PDF..." : "Emitir Orçamento em PDF"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* HISTÓRICO & FINANÇAS SUB-TAB */}
                  {estimates.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>Você ainda não emitiu nenhum orçamento. Use a aba "Emitir Orçamento" para gerar seu primeiro PDF!</p>
                    </div>
                  ) : (
                    <div>
                      {/* KPI Cards */}
                      <div className={styles.kpiGrid}>
                        <div className={styles.kpiCard}>
                          <span className={styles.kpiTitle}>💰 Faturamento Aprovado</span>
                          <span className={styles.kpiValue} style={{ color: "var(--success)" }}>
                            R$ {estimates.filter(e => e.status === "aprovado").reduce((sum, e) => sum + e.total, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.kpiCard}>
                          <span className={styles.kpiTitle}>⏳ Valores Pendentes</span>
                          <span className={styles.kpiValue} style={{ color: "oklch(65% 0.15 80)" }}>
                            R$ {estimates.filter(e => e.status === "pendente").reduce((sum, e) => sum + e.total, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.kpiCard}>
                          <span className={styles.kpiTitle}>🎯 Taxa de Conversão</span>
                          <span className={styles.kpiValue} style={{ color: "var(--primary)" }}>
                            {estimates.length > 0 
                              ? Math.round((estimates.filter(e => e.status === "aprovado").length / estimates.length) * 100) 
                              : 0}%
                          </span>
                        </div>
                      </div>

                      <div className={styles.tabTitleRow} style={{ marginTop: "2rem" }}>
                        <h3>Histórico de Propostas ({estimates.length})</h3>
                      </div>

                      <div className={styles.estimateTableWrapper}>
                        <table className={styles.estimateTable}>
                          <thead>
                            <tr>
                              <th>Cliente</th>
                              <th>Data</th>
                              <th>Itens</th>
                              <th>Total</th>
                              <th>Status</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estimates.map((est) => (
                              <tr key={est.id}>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{est.clientName}</div>
                                  {est.clientPhone && (
                                    <a
                                      href={`https://wa.me/${est.clientPhone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ 
                                        fontSize: "0.75rem", 
                                        color: "var(--success)", 
                                        textDecoration: "underline", 
                                        display: "inline-flex", 
                                        alignItems: "center", 
                                        gap: "2px", 
                                        marginTop: "2px" 
                                      }}
                                    >
                                      💬 WhatsApp
                                    </a>
                                  )}
                                </td>
                                <td>{new Date(est.date).toLocaleDateString("pt-BR")}</td>
                                <td>{est.items.length} {est.items.length === 1 ? "item" : "itens"}</td>
                                <td style={{ fontWeight: 700 }}>R$ {est.total.toFixed(2)}</td>
                                <td>
                                  <select
                                    value={est.status}
                                    onChange={(e) => handleEstimateStatusChange(est.id, e.target.value as Estimate["status"])}
                                    className={`${styles.statusSelectDropdown} ${styles[`statusDropdown_${est.status}`]}`}
                                  >
                                    <option value="pendente">Pendente</option>
                                    <option value="aprovado">Aprovado</option>
                                    <option value="recusado">Recusado</option>
                                  </select>
                                </td>
                                <td>
                                  <div className={styles.actionBtnGroup}>
                                    {est.status === "pendente" && (
                                      <button
                                        onClick={() => handleOpenBillingModal(est)}
                                        className={styles.actionIconBtn}
                                        style={{ 
                                          background: "rgba(22, 163, 74, 0.05)", 
                                          borderColor: "rgba(22, 163, 74, 0.2)", 
                                          color: "oklch(60% 0.15 140)",
                                          padding: "4px 8px",
                                          borderRadius: "6px",
                                          cursor: "pointer"
                                        }}
                                        title="Cobrar Orçamento via WhatsApp"
                                      >
                                        💬
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleGenerateContract(est)}
                                      disabled={isGeneratingContractId === est.id}
                                      className={styles.actionIconBtn}
                                      style={{ 
                                        background: "rgba(76, 29, 149, 0.05)", 
                                        borderColor: "rgba(76, 29, 149, 0.2)", 
                                        color: "var(--primary)",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        cursor: "pointer"
                                      }}
                                      title="Gerar Contrato de Prestação de Serviços (PDF)"
                                    >
                                      {isGeneratingContractId === est.id ? "⏳" : "📄"}
                                    </button>
                                    <button
                                      onClick={() => handleUseEstimateAsTemplate(est)}
                                      className={`${styles.actionIconBtn} ${styles.actionIconBtnTemplate}`}
                                      title="Usar como Modelo para Novo Orçamento"
                                    >
                                      ✍️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEstimate(est.id)}
                                      className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                      title="Excluir Orçamento"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GERADOR DE RECIBOS */}
          {activeTab === "recibos" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>Recibos de Pagamento</h2>
                <div className={styles.subTabsContainer} style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                  <button
                    onClick={() => setReceiptSubTab("emitir")}
                    className={`${styles.subTabBtn} ${receiptSubTab === "emitir" ? styles.subTabBtnActive : ""}`}
                  >
                    Emitir Recibo
                  </button>
                  <button
                    onClick={() => setReceiptSubTab("historico")}
                    className={`${styles.subTabBtn} ${receiptSubTab === "historico" ? styles.subTabBtnActive : ""}`}
                  >
                    Recibos Emitidos
                  </button>
                </div>
              </div>

              {receiptSubTab === "emitir" ? (
                <div>
                  <div className={styles.formGrid}>
                    <div className={styles.formSection}>
                      <h3>Identificação do Recibo</h3>
                      
                      <div className={styles.formGroup}>
                        <label htmlFor="recValue">Valor Recebido (R$)</label>
                        <input
                          id="recValue"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={reciboValue || ""}
                          onChange={(e) => setReciboValue(parseFloat(e.target.value) || 0)}
                          placeholder="Ex: 350.00"
                          className={styles.inputField}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="recClient">Recebido de (Nome do Cliente)</label>
                        <input
                          id="recClient"
                          type="text"
                          required
                          value={reciboClientName}
                          onChange={(e) => setReciboClientName(e.target.value)}
                          placeholder="Ex: Mariana Costa"
                          className={styles.inputField}
                        />
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <h3>Especificações</h3>
                      
                      <div className={styles.formGroup}>
                        <label htmlFor="recDate">Data de Emissão</label>
                        <input
                          id="recDate"
                          type="date"
                          required
                          value={reciboDate}
                          onChange={(e) => setReciboDate(e.target.value)}
                          className={styles.inputField}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="recRef">Referente a (Descrição dos serviços)</label>
                        <input
                          id="recRef"
                          type="text"
                          required
                          value={reciboReferente}
                          onChange={(e) => setReciboReferente(e.target.value)}
                          placeholder="Ex: Serviços de pintura residencial e lixamento"
                          className={styles.inputField}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formSection} style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px' }}>
                    <h3>Configuração & Assinatura do Recibo</h3>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label htmlFor="receiptTheme">Tema do Documento</label>
                        <select
                          id="receiptTheme"
                          value={receiptTheme}
                          onChange={(e) => setReceiptTheme(e.target.value)}
                          className={styles.selectField}
                        >
                          <option value="modern">Moderno (Verde Esmeralda / Navy)</option>
                          <option value="classic">Clássico (Azul Royal)</option>
                          <option value="minimalist">Minimalista (Preto / Branco)</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Assinatura Digital (Opcional)</label>
                        <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
                          <canvas
                            ref={receiptCanvasRef}
                            width={400}
                            height={120}
                            onMouseDown={(e) => handleStartDrawing(e, receiptCanvasRef)}
                            onMouseMove={(e) => handleDraw(e, receiptCanvasRef)}
                            onMouseUp={handleStopDrawing}
                            onMouseLeave={handleStopDrawing}
                            onTouchStart={(e) => handleStartDrawing(e, receiptCanvasRef)}
                            onTouchMove={(e) => handleDraw(e, receiptCanvasRef)}
                            onTouchEnd={handleStopDrawing}
                            style={{
                              border: "2px dashed var(--border-color)",
                              borderRadius: "12px",
                              background: "#f8fafc",
                              cursor: "crosshair",
                              width: "100%",
                              height: "120px",
                              touchAction: "none"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => clearCanvas(receiptCanvasRef)}
                            className={styles.closeBtn}
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "var(--background-soft)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              color: "var(--foreground-muted)"
                            }}
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.summaryBlock} style={{ marginTop: "2rem" }}>
                    <div className={styles.summaryContent}>
                      <button
                        onClick={handleGenerateRecibo}
                        disabled={isGeneratingRecibo}
                        className={`${styles.btnGenerate} btn-glow`}
                        style={{ background: "var(--success)" }}
                      >
                        {isGeneratingRecibo ? "Gerando Recibo..." : "Emitir Recibo em PDF"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* HISTÓRICO DE RECIBOS */}
                  {receipts.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>Você ainda não gerou nenhum recibo. Use a aba "Emitir Recibo" para comprovar seus pagamentos!</p>
                    </div>
                  ) : (
                    <div>
                      {/* KPI Cards */}
                      <div className={styles.kpiGrid}>
                        <div className={styles.kpiCard}>
                          <span className={styles.kpiTitle}>💰 Faturamento Comprovado</span>
                          <span className={styles.kpiValue} style={{ color: "var(--success)" }}>
                            R$ {receipts.reduce((sum, r) => sum + r.value, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.kpiCard}>
                          <span className={styles.kpiTitle}>📄 Recibos Emitidos</span>
                          <span className={styles.kpiValue} style={{ color: "var(--primary)" }}>
                            {receipts.length} {receipts.length === 1 ? "comprovante" : "comprovantes"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.tabTitleRow} style={{ marginTop: "2rem" }}>
                        <h3>Histórico de Recibos</h3>
                      </div>

                      <div className={styles.estimateTableWrapper}>
                        <table className={styles.estimateTable}>
                          <thead>
                            <tr>
                              <th>Cliente</th>
                              <th>Data</th>
                              <th>Referente a</th>
                              <th>Valor</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipts.map((rec) => (
                              <tr key={rec.id}>
                                <td>
                                  <span style={{ fontWeight: 700 }}>{rec.clientName}</span>
                                </td>
                                <td>{new Date(rec.date).toLocaleDateString("pt-BR")}</td>
                                <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={rec.referente}>
                                  {rec.referente}
                                </td>
                                <td style={{ fontWeight: 700, color: "var(--success)" }}>
                                  R$ {rec.value.toFixed(2)}
                                </td>
                                <td>
                                  <div className={styles.actionBtnGroup}>
                                    <button
                                      onClick={() => handleUseReceiptAsTemplate(rec)}
                                      className={`${styles.actionIconBtn} ${styles.actionIconBtnTemplate}`}
                                      title="Usar como Modelo"
                                    >
                                      ✍️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReceipt(rec.id)}
                                      className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                      title="Excluir Recibo"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINANCEIRO */}
          {activeTab === "financas" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>Relatório Financeiro & Despesas</h2>
                <span className={styles.badge} style={{ borderColor: "var(--primary)" }}>
                  Controle de Rentabilidade
                </span>
              </div>

              {/* KPIs de Rentabilidade */}
              {(() => {
                const totalReceipts = receipts.reduce((sum, r) => sum + r.value, 0);
                const totalEstimates = estimates.filter(e => e.status === "aprovado").reduce((sum, e) => sum + e.total, 0);
                const faturamentoBruto = totalReceipts + totalEstimates;
                const totalExpenses = expenses.reduce((sum, exp) => sum + exp.value, 0);
                const lucroLiquido = faturamentoBruto - totalExpenses;
                const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

                return (
                  <div className={styles.kpiGrid} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiTitle}>💰 Faturamento Bruto</span>
                      <span className={styles.kpiValue} style={{ color: "var(--success)" }}>
                        R$ {faturamentoBruto.toFixed(2)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>
                        Recibos + Orçamentos Aprovados
                      </span>
                    </div>

                    <div className={styles.kpiCard}>
                      <span className={styles.kpiTitle}>💸 Despesas Totais</span>
                      <span className={styles.kpiValue} style={{ color: "#dc2626" }}>
                        R$ {totalExpenses.toFixed(2)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>
                        Materiais, combustível, etc.
                      </span>
                    </div>

                    <div className={styles.kpiCard}>
                      <span className={styles.kpiTitle}>🟩 Lucro Líquido Real</span>
                      <span className={styles.kpiValue} style={{ color: lucroLiquido >= 0 ? "var(--success)" : "#dc2626" }}>
                        R$ {lucroLiquido.toFixed(2)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>
                        Faturamento - Despesas
                      </span>
                    </div>

                    <div className={styles.kpiCard}>
                      <span className={styles.kpiTitle}>📈 Margem de Lucro</span>
                      <span className={styles.kpiValue} style={{ color: "var(--primary)" }}>
                        {margemLucro.toFixed(1)}%
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>
                        Rentabilidade média
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: "2rem" }}>
                <form onSubmit={handleSaveExpense} className={styles.formGrid} style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "18px", border: "1px solid var(--border-color)", marginBottom: "2rem" }}>
                  <div style={{ gridColumn: "1 / -1", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--foreground)" }}>Lançar Nova Despesa</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", margin: "0.2rem 0 0 0" }}>Registre os custos relacionados à execução do seu trabalho.</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="expDesc">Descrição da Despesa</label>
                    <input
                      id="expDesc"
                      type="text"
                      required
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      placeholder="Ex: Compra de tintas e trinchas"
                      className={styles.inputField}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="expCat">Categoria</label>
                    <select
                      id="expCat"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as any)}
                      className={styles.selectField}
                    >
                      <option value="material">🎨 Material</option>
                      <option value="transporte">🚗 Transporte / Combustível</option>
                      <option value="ferramentas">🔧 Ferramentas</option>
                      <option value="alimentacao">🍎 Alimentação</option>
                      <option value="outros">📦 Outros</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="expVal">Valor (R$)</label>
                    <input
                      id="expVal"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={expenseValue || ""}
                      onChange={(e) => setExpenseValue(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 150.00"
                      className={styles.inputField}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="expDate">Data da Despesa</label>
                    <input
                      id="expDate"
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button
                      type="submit"
                      disabled={isSavingExpense}
                      className="btn-glow"
                      style={{ 
                        background: "#dc2626", 
                        color: "#ffffff", 
                        padding: "0.7rem 1.5rem", 
                        borderRadius: "10px", 
                        border: "none", 
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {isSavingExpense ? "Lançando..." : "Registrar Despesa"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de despesas */}
              <div className={styles.tabTitleRow} style={{ marginTop: "2rem" }}>
                <h3>Histórico de Despesas</h3>
              </div>

              {expenses.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Você não registrou nenhuma despesa. Use o formulário acima para lançar seus custos!</p>
                </div>
              ) : (
                <div className={styles.estimateTableWrapper}>
                  <table className={styles.estimateTable}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => (
                        <tr key={exp.id}>
                          <td>{new Date(exp.date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td style={{ fontWeight: 600 }}>{exp.description}</td>
                          <td>
                            <span style={{ 
                              fontSize: "0.8rem", 
                              padding: "0.25rem 0.5rem", 
                              borderRadius: "6px", 
                              background: "var(--background-alt)",
                              border: "1px solid var(--border-color)"
                            }}>
                              {exp.category === "material" ? "🎨 Material" :
                               exp.category === "transporte" ? "🚗 Transporte" :
                               exp.category === "ferramentas" ? "🔧 Ferramentas" :
                               exp.category === "alimentacao" ? "🍎 Alimentação" :
                               "📦 Outros"}
                            </span>
                          </td>
                          <td style={{ color: "#dc2626", fontWeight: 700 }}>
                            - R$ {exp.value.toFixed(2)}
                          </td>
                          <td>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                              title="Excluir Lançamento"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PAGAMENTOS & REPASSES */}
          {activeTab === "pagamentos" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>💳 Pagamentos & Repasses (Stripe Connect)</h2>
              </div>

              {stripeStatus.message && (
                <div className={`${styles.stripeAlert} ${stripeStatus.type === "success" ? styles.stripeAlertSuccess : styles.stripeAlertError}`}>
                  <span>{stripeStatus.type === "success" ? "✓" : "⚠"}</span>
                  <p style={{ margin: 0 }}>{stripeStatus.message}</p>
                </div>
              )}

              {professional && (!professional.stripeAccountId || professional.stripeConnectionStatus !== "completed") ? (
                <div className={styles.stripeCard}>
                  <div className={styles.stripeHero}>💰</div>
                  <h2>Receba Pagamentos Diretamente pelo Site</h2>
                  <p>
                    Habilite pagamentos com Cartão de Crédito (à vista ou parcelado) e Pix para seus clientes. 
                    O valor é dividido automaticamente e transferido de forma segura para sua conta bancária.
                  </p>

                  <div className={styles.stripeFeaturesGrid}>
                    <div className={styles.stripeFeatureItem}>
                      <span className={styles.stripeFeatureIcon}>⚡</span>
                      <div className={styles.stripeFeatureText}>
                        <h4>Taxa Simples de 5%</h4>
                        <p>Sem mensalidade. Só cobramos a comissão de 5% quando você realizar vendas.</p>
                      </div>
                    </div>

                    <div className={styles.stripeFeatureItem}>
                      <span className={styles.stripeFeatureIcon}>💳</span>
                      <div className={styles.stripeFeatureText}>
                        <h4>Crédito Parcelado & Pix</h4>
                        <p>Facilite para seu cliente parcelar os pagamentos e receba Pix direto.</p>
                      </div>
                    </div>

                    <div className={styles.stripeFeatureItem}>
                      <span className={styles.stripeFeatureIcon}>🏦</span>
                      <div className={styles.stripeFeatureText}>
                        <h4>Repasses Automáticos</h4>
                        <p>A Stripe transfere os valores diretamente para o seu banco conforme o calendário de saques.</p>
                      </div>
                    </div>

                    <div className={styles.stripeFeatureItem}>
                      <span className={styles.stripeFeatureIcon}>🛡️</span>
                      <div className={styles.stripeFeatureText}>
                        <h4>Parceiro de Confiança</h4>
                        <p>Segurança líder mundial processada pela Stripe (mesmo sistema de Uber, Booking e Netflix).</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className={styles.aiButton}
                    style={{ fontSize: "1rem", padding: "0.8rem 2rem", height: "auto" }}
                  >
                    {stripeLoading ? (
                      <>
                        <span className={styles.spinner} style={{ marginRight: "0.5rem" }} />
                        Redirecionando para a Stripe...
                      </>
                    ) : (
                      "Conectar minha conta bancária com a Stripe"
                    )}
                  </button>
                </div>
              ) : (
                <div className={styles.stripeCard}>
                  <div className={styles.stripeHero}>✅</div>
                  <div className={styles.stripeStatusBadge}>
                    <span>●</span> Conta Conectada e Ativa
                  </div>
                  <h2>Seus Recebimentos estão Configurados!</h2>
                  <p>
                    Seus clientes agora podem pagar pelos seus serviços e produtos diretamente pela plataforma.
                    A comissão de 5% será deduzida automaticamente de cada venda e o saldo será enviado à sua conta bancária.
                  </p>

                  <div style={{ background: "var(--background)", border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "10px", textAlign: "left", marginBottom: "2rem", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ color: "var(--foreground-muted)" }}>ID da Conta Stripe:</span>
                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{professional?.stripeAccountId}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--foreground-muted)" }}>Status do Onboarding:</span>
                      <span style={{ color: "oklch(45% 0.17 142)", fontWeight: "bold" }}>Concluído</span>
                    </div>
                  </div>

                  <button
                    onClick={handleStripeLogin}
                    disabled={stripeLoginLoading}
                    className={styles.aiButton}
                    style={{ fontSize: "1rem", padding: "0.8rem 2rem", height: "auto" }}
                  >
                    {stripeLoginLoading ? (
                      <>
                        <span className={styles.spinner} style={{ marginRight: "0.5rem" }} />
                        Carregando Painel da Stripe...
                      </>
                    ) : (
                      "Ir para o Painel Express da Stripe"
                    )}
                  </button>
                  <p style={{ fontSize: "0.75rem", marginTop: "1rem", color: "var(--foreground-muted)" }}>
                    No painel da Stripe você pode gerenciar suas transferências bancárias, atualizar dados de CPF/CNPJ ou conta corrente e ver o histórico de tarifas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PERFIL */}
          {activeTab === "perfil" && (
            <div>
              <div className={styles.tabTitleRow}>
                <h2>Configurações do Meu Perfil Público</h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDigitalCardOpen(true);
                      setIsCardFlipped(false);
                    }}
                    className={styles.backBtn}
                    style={{ padding: "0 1rem", fontSize: "0.85rem", height: "36px", borderColor: "var(--primary)", color: "var(--primary)" }}
                  >
                    📇 Meu Cartão Digital 3D
                  </button>
                  <span className={styles.badge} style={{ borderColor: "var(--success)" }}>
                    Link: central.me/{professional.username}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className={styles.profileEditForm}>
                {/* Brand Logo Section */}
                <div className={styles.formGroup} style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>Logotipo ou Marca Personalizada</label>
                  <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", margin: 0 }}>
                    Adicione a sua própria marca ou logotipo para ser impressa nos seus orçamentos e recibos em PDF.
                  </p>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginTop: "0.5rem" }}>
                    <div style={{ 
                      width: "80px", 
                      height: "80px", 
                      borderRadius: "12px", 
                      border: "2px dashed var(--border-color)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      overflow: "hidden", 
                      background: "var(--background-alt)",
                      position: "relative"
                    }}>
                      {profileLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={profileLogoUrl} 
                          alt="Logo do Profissional" 
                          style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                        />
                      ) : (
                        <span style={{ fontSize: "1.75rem", opacity: 0.35 }}>🏢</span>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <label 
                          className={styles.backBtn} 
                          style={{ cursor: "pointer", display: "inline-flex", padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "4px" }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          Selecionar Imagem
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: "none" }} 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const base64 = await optimizeAndToBase64(file);
                                  setProfileLogoUrl(base64);
                                } catch (err: any) {
                                  alert(err.message || "Erro ao processar imagem.");
                                }
                              }
                            }}
                          />
                        </label>
                        
                        {profileLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setProfileLogoUrl("")}
                            className={styles.backBtn}
                            style={{ 
                              borderColor: "#fecaca", 
                              color: "#dc2626", 
                              background: "rgba(220, 38, 38, 0.05)",
                              padding: "0.5rem 0.9rem",
                              fontSize: "0.85rem"
                            }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                        Formatos aceitos: PNG, JPG. O arquivo será otimizado automaticamente.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pix Key Configuration Section */}
                <div className={styles.formGroup} style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>Dados de Recebimento (Chave Pix)</label>
                  <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", margin: 0 }}>
                    Configure sua chave Pix para gerar QR Codes e dados de pagamento direto nos seus orçamentos e recibos em PDF.
                  </p>
                  
                  <div className={styles.formGrid} style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="profPixType">Tipo de Chave Pix</label>
                      <select
                        id="profPixType"
                        value={profilePixKeyType}
                        onChange={(e) => setProfilePixKeyType(e.target.value as any)}
                        className={styles.selectField}
                      >
                        <option value="">-- Não utilizar Pix nos PDFs --</option>
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="celular">Celular</option>
                        <option value="email">E-mail</option>
                        <option value="chave_aleatoria">Chave Aleatória</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="profPixKey">Chave Pix</label>
                      <input
                        id="profPixKey"
                        type="text"
                        value={profilePixKey}
                        onChange={(e) => setProfilePixKey(e.target.value)}
                        placeholder={
                          profilePixKeyType === "cpf" ? "Ex: 123.456.789-00" :
                          profilePixKeyType === "cnpj" ? "Ex: 12.345.678/0001-99" :
                          profilePixKeyType === "celular" ? "Ex: 11999999999" :
                          profilePixKeyType === "email" ? "Ex: pix@seuemail.com" :
                          profilePixKeyType === "chave_aleatoria" ? "Ex: abcde-12345-..." :
                          "Selecione o tipo de chave..."
                        }
                        className={styles.inputField}
                        disabled={!profilePixKeyType}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profName">Nome Completo</label>
                    <input
                      id="profName"
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="profTitle">Título Profissional</label>
                    <input
                      id="profTitle"
                      type="text"
                      required
                      value={profileTitle}
                      onChange={(e) => setProfileTitle(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profCategory">Categoria</label>
                    <select
                      id="profCategory"
                      value={profileCategory}
                      onChange={(e) => setProfileCategory(e.target.value)}
                      className={styles.selectField}
                    >
                      {PROFESSIONAL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="outro">Outro (Digitar...)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="profCity">Cidade e Estado</label>
                    <input
                      id="profCity"
                      type="text"
                      required
                      value={profileCity}
                      onChange={(e) => setProfileCity(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                </div>

                {profileCategory === "outro" && (
                  <div className={styles.formGrid} style={{ gridTemplateColumns: "1fr" }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="customProfileCategory">Digite sua Categoria / Profissão</label>
                      <input
                        id="customProfileCategory"
                        type="text"
                        required
                        value={customProfileCategoryText}
                        onChange={(e) => setCustomProfileCategoryText(e.target.value)}
                        placeholder="Ex: Personal Trainer, Costureira, Aero-Fotografia..."
                        className={styles.inputField}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.formGroup} style={{ maxWidth: "50%" }}>
                  <label htmlFor="profWhatsapp">WhatsApp (somente números com DDD)</label>
                  <input
                    id="profWhatsapp"
                    type="text"
                    required
                    value={profileWhatsapp}
                    onChange={(e) => setProfileWhatsapp(e.target.value.replace(/\D/g, ""))}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.bioHeaderRow}>
                    <label htmlFor="profBio">Sobre Mim / Descrição de Trabalho</label>
                    <button
                      type="button"
                      onClick={handleImproveBioWithAI}
                      disabled={isImprovingBio}
                      className={styles.aiButton}
                    >
                      {isImprovingBio ? (
                        <>
                          <span className={styles.spinner}></span> Melhorando...
                        </>
                      ) : (
                        "Melhorar com IA ✨"
                      )}
                    </button>
                  </div>
                  <textarea
                    id="profBio"
                    required
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className={styles.textareaField}
                    style={{ minHeight: "120px" }}
                  />
                </div>

                <button type="submit" disabled={isSavingProfile} className="btn-glow" style={{ padding: "0.8rem", borderRadius: "10px", fontWeight: 700, width: "200px" }}>
                  {isSavingProfile ? "Salvando..." : "Salvar Alterações"}
                </button>
              </form>

              {/* Coletor de Avaliações Rápido */}
              <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border-color)" }}>
                <h3 style={{ fontSize: "1.25rem", color: "var(--foreground)", marginBottom: "0.5rem" }}>Coletor de Avaliações Rápido</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", marginBottom: "1.5rem" }}>
                  Consiga mais clientes recebendo avaliações positivas! Envie o link abaixo para seus clientes por WhatsApp para coletar feedbacks instantaneamente.
                </p>

                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "1rem", 
                  background: "var(--primary-glow)", 
                  padding: "1.5rem", 
                  borderRadius: "14px", 
                  border: "1px solid rgba(76, 29, 149, 0.15)",
                  flexWrap: "wrap"
                }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)", display: "block", marginBottom: "0.4rem" }}>
                      Seu Link de Avaliação Direta:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/${professional.username}?avaliar=true` : `https://central.me/${professional.username}?avaliar=true`}
                      style={{ 
                        width: "100%", 
                        padding: "0.6rem 0.8rem", 
                        borderRadius: "8px", 
                        border: "1px solid rgba(76, 29, 149, 0.25)", 
                        background: "#ffffff", 
                        fontSize: "0.85rem", 
                        fontWeight: 500, 
                        color: "var(--foreground)" 
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", alignSelf: "end" }}>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/${professional.username}?avaliar=true`;
                        navigator.clipboard.writeText(link);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className={styles.backBtn}
                      style={{ 
                        padding: "0.6rem 1.1rem", 
                        fontSize: "0.85rem", 
                        background: "var(--primary)", 
                        color: "#ffffff", 
                        borderColor: "var(--primary)" 
                      }}
                    >
                      {isCopied ? "✓ Copiado!" : "Copiar Link"}
                    </button>
                    
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Olá! Gostou do meu trabalho? Por favor, deixe uma rápida avaliação no meu perfil público: ${typeof window !== "undefined" ? window.location.origin : "https://central.me"}/${professional.username}?avaliar=true. Obrigado!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.backBtn}
                      style={{ 
                        padding: "0.6rem 1.1rem", 
                        fontSize: "0.85rem", 
                        background: "#25D366", 
                        borderColor: "#25D366", 
                        color: "#ffffff" 
                      }}
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Seção da Galeria */}
              <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border-color)" }}>
                <h3 style={{ fontSize: "1.25rem", color: "var(--foreground)", marginBottom: "0.5rem" }}>Galeria de Portfólio</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", marginBottom: "1.5rem" }}>
                  Adicione fotos reais dos seus trabalhos realizados. Elas serão exibidas na página pública do seu perfil.
                </p>

                {/* Form para adicionar nova foto */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "end", background: "var(--background-alt)", padding: "1.2rem", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "2rem" }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label htmlFor="galleryTitle">Legenda da Foto</label>
                    <input
                      id="galleryTitle"
                      type="text"
                      placeholder="Ex: Pintura sala de estar"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label htmlFor="galleryFile">Selecionar Imagem</label>
                    <input
                      id="galleryFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
                      className={styles.inputField}
                      style={{ padding: "0.5rem" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGalleryImage}
                    disabled={isUploadingGallery}
                    className="btn-glow"
                    style={{ padding: "0.75rem 1.2rem", borderRadius: "10px", fontWeight: 700 }}
                  >
                    {isUploadingGallery ? "Adicionando..." : "Adicionar Foto"}
                  </button>
                </div>

                {/* Grid de fotos atuais */}
                {professional.gallery && professional.gallery.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                    {professional.gallery.map((item: any, idx: number) => (
                      <div key={idx} style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-color)", background: "var(--background-alt)" }}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "150px", background: item.color || "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", padding: "1rem", textAlign: "center", fontSize: "0.85rem" }}>
                            {item.title}
                          </div>
                        )}
                        <div style={{ padding: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(idx)}
                            style={{ background: "transparent", border: "none", color: "var(--error)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>Nenhuma foto adicionada ao portfólio.</div>
                )}
              </div>

              {/* Seção de Avaliações Recebidas */}
              <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border-color)" }}>
                <h3 style={{ fontSize: "1.25rem", color: "var(--foreground)", marginBottom: "0.5rem" }}>Avaliações dos Clientes</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", marginBottom: "1.5rem" }}>
                  Acompanhe os depoimentos dos seus clientes e envie respostas oficiais que ficarão visíveis em seu perfil público.
                </p>

                {reviews.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={{ background: "var(--background-alt)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--foreground)" }}>{rev.clientName}</span>
                            <div style={{ display: "flex", gap: "0.15rem", color: "#ffb800", marginTop: "0.25rem" }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < rev.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                              ))}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>
                            {new Date(rev.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.95rem", color: "var(--foreground-muted)", margin: "0 0 1rem 0", lineHeight: "1.5" }}>{rev.comment}</p>

                        {/* Existing reply block */}
                        {rev.reply && (
                          <div style={{ background: "rgba(76, 29, 149, 0.04)", borderLeft: "3px solid var(--primary)", padding: "0.8rem 1rem", borderRadius: "4px 12px 12px 4px", marginBottom: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>Sua Resposta Oficial</span>
                              <span style={{ fontSize: "0.78rem", color: "var(--foreground-muted)" }}>
                                {new Date(rev.repliedAt || Date.now()).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "var(--foreground)", margin: 0, lineHeight: "1.45" }}>{rev.reply}</p>
                          </div>
                        )}

                        {/* Reply Form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <textarea
                            rows={2}
                            placeholder={rev.reply ? "Editar sua resposta oficial..." : "Responder a esta avaliação..."}
                            value={replyInputs[rev.id] || ""}
                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [rev.id]: e.target.value }))}
                            className={styles.inputField}
                            style={{ resize: "vertical", minHeight: "60px", fontSize: "0.9rem", padding: "0.6rem" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveReply(rev.id)}
                            disabled={submittingReplyId === rev.id}
                            className="btn-glow"
                            style={{ alignSelf: "flex-end", padding: "0.5rem 1.1rem", fontSize: "0.85rem", borderRadius: "8px", fontWeight: 700 }}
                          >
                            {submittingReplyId === rev.id ? "Enviando..." : rev.reply ? "Salvar Nova Resposta" : "Responder"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>Nenhuma avaliação recebida ainda. Compartilhe seu link de avaliação direta acima com seus clientes!</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Service Modal */}
      <div 
        className="modal-overlay" 
        hidden={!isAddServiceOpen}
        onClick={() => setIsAddServiceOpen(false)}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Cadastrar Novo Serviço</h3>
            <button 
              onClick={() => setIsAddServiceOpen(false)}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onSubmit={handleAddService}>
            <div className={styles.formGroup}>
              <label htmlFor="svcName">Nome do Serviço</label>
              <input
                id="svcName"
                type="text"
                required
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Ex: Pintura de Teto"
                className={styles.inputField}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div className={styles.formGroup}>
                <label htmlFor="svcPrice">Preço Base (R$)</label>
                <input
                  id="svcPrice"
                  type="number"
                  required
                  min="0"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 30"
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="svcUnit">Unidade de Medida</label>
                <select
                  id="svcUnit"
                  value={newServiceUnit}
                  onChange={(e) => setNewServiceUnit(e.target.value)}
                  className={styles.selectField}
                >
                  <option value="m²">m²</option>
                  <option value="hora">hora</option>
                  <option value="sessão">sessão</option>
                  <option value="cento">cento</option>
                  <option value="serviço">serviço</option>
                  <option value="bolo">bolo</option>
                  <option value="kit">kit</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                <label htmlFor="svcDesc">Descrição Completa</label>
                <button
                  type="button"
                  onClick={handleGenerateAIDesc}
                  disabled={isGeneratingDesc}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.2rem"
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m12 3-1.912 5.886L4.2 9.2l4.8 4.186L7.088 19.5 12 16l4.912 3.5-1.912-6.114 4.8-4.186-5.888-.314L12 3z"/>
                  </svg>
                  <span>{isGeneratingDesc ? "Gerando..." : "✍️ Escrever com IA"}</span>
                </button>
              </div>
              <textarea
                id="svcDesc"
                value={newServiceDesc}
                onChange={(e) => setNewServiceDesc(e.target.value)}
                placeholder="Descreva o que está incluído no preço... (ou clique acima para a IA redigir)"
                className={styles.textareaField}
              />
            </div>

            <button type="submit" className={`${styles.submitBtn} btn-glow`}>
              Salvar Serviço
            </button>
          </form>
        </div>
      </div>

      {/* WhatsApp Billing Copilot Modal */}
      <div 
        className="modal-overlay" 
        hidden={!isBillingModalOpen}
        onClick={() => setIsBillingModalOpen(false)}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "480px" }}
        >
          <div className={styles.modalHeader}>
            <h3>💬 Assistente de Cobrança (WhatsApp)</h3>
            <button 
              onClick={() => setIsBillingModalOpen(false)}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
              Escolha o tom de voz ideal para cobrar seu cliente <strong>{billingEstimate?.clientName}</strong> sobre o orçamento pendente:
            </p>

            <div className={styles.toneSelector}>
              <button
                type="button"
                className={`${styles.toneBtn} ${billingTone === "amigavel" ? styles.toneBtnActive : ""}`}
                onClick={() => handleBillingToneChange("amigavel")}
              >
                😊 Amigável
              </button>
              <button
                type="button"
                className={`${styles.toneBtn} ${billingTone === "formal" ? styles.toneBtnActive : ""}`}
                onClick={() => handleBillingToneChange("formal")}
              >
                💼 Formal
              </button>
              <button
                type="button"
                className={`${styles.toneBtn} ${billingTone === "firme" ? styles.toneBtnActive : ""}`}
                onClick={() => handleBillingToneChange("firme")}
              >
                ⚡ Direta / Firme
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>Mensagem Editável</label>
              <button
                type="button"
                onClick={handleImproveBillingMessageWithAI}
                disabled={isGeneratingBillingMessage}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.2rem"
                }}
              >
                <span>{isGeneratingBillingMessage ? "Melhorando..." : "✨ Refinar com IA"}</span>
              </button>
            </div>

            <textarea
              className={styles.billingMessageTextarea}
              value={billingMessage}
              onChange={(e) => setBillingMessage(e.target.value)}
            />

            <div className={styles.billingActions}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(billingMessage);
                  alert("Mensagem copiada para a área de transferência!");
                }}
                className={styles.backBtn}
                style={{ flex: 1, justifyContent: "center" }}
              >
                Copiar Texto 📋
              </button>
              
              <a
                href={`https://wa.me/${billingEstimate?.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(billingMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow"
                style={{
                  flex: 1.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  color: "#ffffff"
                }}
              >
                Enviar no WhatsApp 💬
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Flippable Digital Business Card Modal */}
      <div 
        className="modal-overlay" 
        hidden={!isDigitalCardOpen}
        onClick={() => setIsDigitalCardOpen(false)}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "400px" }}
        >
          <div className={styles.modalHeader}>
            <h3>📇 Meu Cartão Digital 3D</h3>
            <button 
              onClick={() => setIsDigitalCardOpen(false)}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", textAlign: "center", marginTop: "0.5rem" }}>
            Clique no cartão para girá-lo em 3D.
          </p>

          <div className={styles.cardPerspective}>
            <div 
              className={`${styles.businessCard} ${isCardFlipped ? styles.businessCardFlipped : ""}`}
              onClick={() => setIsCardFlipped(!isCardFlipped)}
            >
              {/* FRONT FACE */}
              <div 
                className={`${styles.cardFace} ${styles.cardFaceFront}`}
                style={{ 
                  background: professional?.cardDesign?.bg || professional?.avatarColor || "linear-gradient(135deg, oklch(25% 0.05 260), oklch(15% 0.05 260))",
                  color: professional?.cardDesign?.textColor || "#ffffff",
                  position: "relative",
                  overflow: "hidden",
                  border: professional?.cardDesign?.accentColor ? `1px solid ${professional.cardDesign.accentColor}40` : "none"
                }}
              >
                {getPatternOverlay(professional?.cardDesign?.patternType, professional?.cardDesign?.accentColor)}

                <div className={styles.cardHeader} style={{ position: "relative", zIndex: 2 }}>
                  <div>
                    <h3 className={styles.cardProfName} style={{ color: professional?.cardDesign?.textColor || "#ffffff" }}>{professional?.name}</h3>
                    <p className={styles.cardProfTitle} style={{ color: professional?.cardDesign?.textColor || "#ffffff", opacity: 0.85 }}>{professional?.title || "Profissional Autônomo"}</p>
                  </div>
                  {professional?.logoUrl ? (
                    <img 
                      src={professional.logoUrl} 
                      alt="Logo" 
                      style={{ width: "32px", height: "32px", borderRadius: "50%", border: `1.5px solid ${professional?.cardDesign?.accentColor || "#ffffff"}` }} 
                    />
                  ) : (
                    <div className={styles.cardChip} style={{ background: "linear-gradient(135deg, #f5d061 0%, #e6b830 50%, #d4af37 100%)", boxShadow: "0 2px 5px rgba(0,0,0,0.15)" }}></div>
                  )}
                </div>
                
                <div className={styles.cardFooter} style={{ position: "relative", zIndex: 2 }}>
                  <div className={styles.cardContacts} style={{ color: professional?.cardDesign?.textColor || "#ffffff" }}>
                    <span style={{ background: professional?.cardDesign?.badgeBg || "rgba(255,255,255,0.08)", padding: "0.15rem 0.4rem", borderRadius: "6px", fontSize: "0.65rem", display: "inline-flex", alignItems: "center", gap: "0.2rem", border: "1px solid rgba(255,255,255,0.05)" }}>📞 {professional?.whatsapp}</span>
                    <span style={{ background: professional?.cardDesign?.badgeBg || "rgba(255,255,255,0.08)", padding: "0.15rem 0.4rem", borderRadius: "6px", fontSize: "0.65rem", display: "inline-flex", alignItems: "center", gap: "0.2rem", border: "1px solid rgba(255,255,255,0.05)" }}>📍 {professional?.city}</span>
                  </div>
                  <div className={styles.cardLogo} style={{ color: professional?.cardDesign?.textColor || "#ffffff" }}>
                    central<span style={{ color: professional?.cardDesign?.accentColor || "var(--primary)" }}>.me</span>
                  </div>
                </div>
              </div>

              {/* BACK FACE */}
              <div 
                className={`${styles.cardFace} ${styles.cardFaceBack}`}
                style={{ 
                  background: "#0f172a",
                  color: "#ffffff",
                  border: `2.5px solid ${professional?.cardDesign?.accentColor || "var(--primary)"}`,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1.5rem"
                }}
              >
                <div style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.05,
                  backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                  pointerEvents: "none"
                }} />

                {profileQrCodeUrl ? (
                  <>
                    <img 
                      src={profileQrCodeUrl} 
                      alt="Profile QR Code" 
                      className={styles.cardQrCode} 
                      style={{ 
                        width: "120px", 
                        height: "120px", 
                        border: `3px solid ${professional?.cardDesign?.accentColor || "var(--primary)"}`, 
                        padding: "0.4rem", 
                        borderRadius: "14px", 
                        background: "white",
                        boxShadow: `0 8px 20px ${professional?.cardDesign?.accentColor ? professional.cardDesign.accentColor + "25" : "rgba(0,0,0,0.4)"}`,
                        position: "relative",
                        zIndex: 2
                      }} 
                    />
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#ffffff", marginTop: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", position: "relative", zIndex: 2 }}>Escaneie meu perfil</span>
                    <span className={styles.cardBackHint} style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.65rem", marginTop: "0.1rem", position: "relative", zIndex: 2 }}>Acesso ao meu catálogo, fotos e avaliações</span>
                  </>
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Gerando QR Code...</span>
                )}
              </div>
            </div>
          </div>

          {/* AI Generator Panel */}
          <div style={{
            background: "var(--background-alt)",
            border: "1px dashed var(--border-color)",
            borderRadius: "12px",
            padding: "0.8rem",
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.1rem" }}>✨</span>
              <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground)" }}>Personalizar Estilo com IA</h4>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", margin: 0 }}>
              A IA analisará sua profissão para sugerir cores e padrões exclusivos. Você também pode guiar o visual:
            </p>
            <input
              type="text"
              value={aiCardPrompt}
              onChange={(e) => setAiCardPrompt(e.target.value)}
              placeholder="Ex: Tons de ouro luxuoso, minimalista escuro, neon roxo..."
              style={{
                width: "100%",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--background)",
                fontSize: "0.75rem",
                color: "var(--foreground)",
                outline: "none"
              }}
            />
            <button
              type="button"
              disabled={isGeneratingCardDesign}
              onClick={handleGenerateCardDesign}
              className="btn-glow"
              style={{
                width: "100%",
                padding: "0.45rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem"
              }}
            >
              {isGeneratingCardDesign ? (
                <>
                  <div style={{
                    width: "12px",
                    height: "12px",
                    border: "2px solid #fff",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Criando Design...
                </>
              ) : (
                "🪄 Gerar Design Exclusivo (Grátis)"
              )}
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={() => {
                const profileUrl = typeof window !== "undefined"
                  ? `${window.location.origin}/${professional?.username}`
                  : `https://central.me/${professional?.username}`;
                navigator.clipboard.writeText(profileUrl);
                alert("Link do seu perfil copiado!");
              }}
              className={styles.backBtn}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Copiar Link do Perfil 🔗
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <div 
        className="modal-overlay" 
        hidden={!isAddProductOpen}
        onClick={() => {
          setIsAddProductOpen(false);
          setEditingProduct(null);
          setNewProductName("");
          setNewProductPrice(0);
          setNewProductDesc("");
          setNewProductStatus("ativo");
          setNewProductCondition("novo");
          setNewProductCategory("outros");
          setNewProductLocation("");
          setNewProductImageUrls([]);
        }}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>{editingProduct ? "Editar Anúncio de Produto" : "Criar Anúncio de Produto"}</h3>
            <button 
              onClick={() => {
                setIsAddProductOpen(false);
                setEditingProduct(null);
                setNewProductName("");
                setNewProductPrice(0);
                setNewProductDesc("");
                setNewProductStatus("ativo");
                setNewProductCondition("novo");
                setNewProductCategory("outros");
                setNewProductLocation("");
                setNewProductImageUrls([]);
              }}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSaveProduct}>
            {/* Foto do Produto */}
            <div className={styles.formGroup}>
              <label>Fotos do Produto (Selecione uma ou mais)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.3rem" }}>
                {newProductImageUrls.map((url, index) => (
                  <div key={index} style={{ position: "relative", width: "90px", height: "90px", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                    <img src={url} alt={`Preview ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {index === 0 && (
                      <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--primary)", color: "#fff", fontSize: "0.6rem", fontWeight: "bold", textAlign: "center", padding: "1px 0" }}>
                        Principal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewProductImageUrls(newProductImageUrls.filter((_, idx) => idx !== index))}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(0,0,0,0.6)",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                        zIndex: 10
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {newProductImageUrls.length < 6 && (
                  <div 
                    style={{
                      width: "90px",
                      height: "90px",
                      border: "2px dashed var(--border-color)",
                      borderRadius: "10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.02)"
                    }}
                    onClick={() => document.getElementById("productPhotoInput")?.click()}
                  >
                    <span style={{ fontSize: "1.2rem" }}>+ 📷</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--foreground-muted)", textAlign: "center", marginTop: "2px" }}>
                      {isUploadingProductPhoto ? "Lendo..." : "Add Foto"}
                    </span>
                  </div>
                )}
              </div>
              <input
                id="productPhotoInput"
                type="file"
                multiple
                accept="image/*"
                onChange={handleProductPhotoChange}
                style={{ display: "none" }}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="prodName">Nome do Produto / Item</label>
              <input
                id="prodName"
                type="text"
                required
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Ex: Lata de Tinta Acrílica Suvinil 18L"
                className={styles.inputField}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div className={styles.formGroup}>
                <label htmlFor="prodPrice">Preço de Venda (R$)</label>
                <input
                  id="prodPrice"
                  type="number"
                  required
                  min="0"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 350"
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="prodStatus">Disponibilidade</label>
                <select
                  id="prodStatus"
                  value={newProductStatus}
                  onChange={(e) => setNewProductStatus(e.target.value as "ativo" | "esgotado")}
                  className={styles.selectField}
                >
                  <option value="ativo">Disponível / Ativo</option>
                  <option value="esgotado">Esgotado</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div className={styles.formGroup}>
                <label htmlFor="prodCondition">Condição / Estado</label>
                <select
                  id="prodCondition"
                  value={newProductCondition}
                  onChange={(e) => setNewProductCondition(e.target.value as Product["condition"])}
                  className={styles.selectField}
                >
                  <option value="novo">Novo (Na caixa / Nunca usado)</option>
                  <option value="semi_novo">Seminovo (Sem marcas de uso)</option>
                  <option value="usado_excelente">Usado - Excelente (Pouco uso)</option>
                  <option value="usado_bom">Usado - Bom (Funcionando perfeito)</option>
                  <option value="usado_marcas">Usado - Marcas de Uso</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="prodCategory">Categoria</label>
                <select
                  id="prodCategory"
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value as Product["category"])}
                  className={styles.selectField}
                >
                  <option value="ferramentas">Ferramentas / Equipamentos</option>
                  <option value="materiais">Materiais de Construção</option>
                  <option value="decoracao">Móveis / Decoração</option>
                  <option value="eletronicos">Eletrônicos / Eletro</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="prodLocation">Local de Retirada / Envio</label>
              <input
                id="prodLocation"
                type="text"
                value={newProductLocation}
                onChange={(e) => setNewProductLocation(e.target.value)}
                placeholder="Ex: Pinheiros, São Paulo - SP"
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Cor Representativa (Fallback para estilo do card)</label>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                {gradients.map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNewProductColor(grad)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: grad,
                      border: newProductColor === grad ? "3px solid var(--primary)" : "1px solid rgba(0,0,0,0.1)",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="prodDesc">Descrição Completa</label>
              <textarea
                id="prodDesc"
                value={newProductDesc}
                onChange={(e) => setNewProductDesc(e.target.value)}
                placeholder="Ex: Sobra de obra, lacrada, na cor Branco Neve..."
                className={styles.textareaField}
                style={{ minHeight: "100px" }}
              />
            </div>

            <button type="submit" className={`${styles.submitBtn} btn-glow`}>
              {editingProduct ? "Salvar Alterações" : "Publicar Anúncio 📦"}
            </button>
          </form>
        </div>
      </div>

      {/* Contract Signature & Theme Selection Modal */}
      <div 
        className="modal-overlay" 
        hidden={!isContractSigOpen}
        onClick={() => {
          setIsContractSigOpen(false);
          setActiveEstimateForContract(null);
        }}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Configurar Contrato</h3>
            <button 
              onClick={() => {
                setIsContractSigOpen(false);
                setActiveEstimateForContract(null);
              }}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="contractTheme">Tema do Contrato</label>
            <select
              id="contractTheme"
              value={contractTheme}
              onChange={(e) => setContractTheme(e.target.value)}
              className={styles.selectField}
            >
              <option value="modern">Moderno (Roxo / Navy)</option>
              <option value="classic">Clássico (Azul Royal)</option>
              <option value="minimalist">Minimalista (Preto / Branco)</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
            <label>Assinatura Digital (CONTRATADA)</label>
            <div style={{ position: "relative", width: "100%" }}>
              <canvas
                ref={contractModalCanvasRef}
                width={400}
                height={150}
                onMouseDown={(e) => handleStartDrawing(e, contractModalCanvasRef)}
                onMouseMove={(e) => handleDraw(e, contractModalCanvasRef)}
                onMouseUp={handleStopDrawing}
                onMouseLeave={handleStopDrawing}
                onTouchStart={(e) => handleStartDrawing(e, contractModalCanvasRef)}
                onTouchMove={(e) => handleDraw(e, contractModalCanvasRef)}
                onTouchEnd={handleStopDrawing}
                style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  cursor: "crosshair",
                  width: "100%",
                  height: "150px",
                  touchAction: "none"
                }}
              />
              <button
                type="button"
                onClick={() => clearCanvas(contractModalCanvasRef)}
                className={styles.closeBtn}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "var(--background-soft)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  color: "var(--foreground-muted)"
                }}
              >
                Limpar
              </button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginTop: "0.4rem" }}>
              Assine com o mouse ou o dedo sobre a área acima. O contratante assinará fisicamente no documento impresso.
            </p>
          </div>

          <button 
            onClick={handleConfirmGenerateContract}
            className={`${styles.submitBtn} btn-glow`}
            style={{ marginTop: "1.5rem" }}
          >
            Gerar Contrato de Prestação de Serviços (PDF) 📄
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
