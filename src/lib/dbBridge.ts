import { db, isFirebaseConfigured } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { Professional, Service, Lead, mockProfessionals, Expense, Appointment, Product } from "@/data/mockData";

// Get professional by ID
export async function getProfessionalById(id: string): Promise<Professional | null> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "professionals", id);
      const [docSnap, servicesSnapshot, productsSnapshot] = await Promise.all([
        getDoc(docRef),
        getDocs(collection(db, "professionals", id, "services")),
        getDocs(collection(db, "professionals", id, "products")).catch(e => {
          console.error("Firestore products subcollection error:", e);
          return { docs: [] } as any;
        })
      ]);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        const services = servicesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Service));
        const products = productsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));
        
        return {
          id: docSnap.id,
          username: docData.username,
          name: docData.name,
          title: docData.title,
          category: docData.category,
          city: docData.city,
          rating: docData.rating || 5.0,
          reviewsCount: docData.reviewsCount || 1,
          avatarColor: docData.avatarColor || "linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))",
          bio: docData.bio,
          whatsapp: docData.whatsapp,
          gallery: docData.gallery || [],
          services,
          products,
          logoUrl: docData.logoUrl || "",
          pixKeyType: docData.pixKeyType || "",
          pixKey: docData.pixKey || "",
          cardDesign: docData.cardDesign || undefined,
          stripeAccountId: docData.stripeAccountId || "",
          stripeConnectionStatus: docData.stripeConnectionStatus || ""
        } as Professional;
      }
      return null;
    } catch (err) {
      console.error("Firestore getProfessionalById error:", err);
    }
  }
  
  // LocalStorage / Mock fallback
  if (typeof window !== "undefined") {
    const localProfile = localStorage.getItem(`central_profile_${id}`) || localStorage.getItem("central_profile");
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      if (parsed.id === id) {
        // load services
        const localServices = localStorage.getItem(`central_services_${id}`) || localStorage.getItem("central_services");
        const services = localServices ? JSON.parse(localServices) : [];
        // load products
        const localProducts = localStorage.getItem(`central_products_${id}`) || localStorage.getItem("central_products");
        const products = localProducts ? JSON.parse(localProducts) : [];
        return { ...parsed, services, products };
      }
    }
  }
  
  const found = mockProfessionals.find(p => p.id === id);
  if (found) {
    if (typeof window !== "undefined") {
      const localServices = localStorage.getItem(`central_services_${id}`) || localStorage.getItem("central_services");
      const localProducts = localStorage.getItem(`central_products_${id}`) || localStorage.getItem("central_products");
      const services = localServices ? JSON.parse(localServices) : found.services;
      const products = localProducts ? JSON.parse(localProducts) : [];
      return { ...found, services, products };
    }
    return found;
  }
  return null;
}

// Create professional record (usually on signup)
export async function createProfessional(prof: Professional): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const { services, ...profileData } = prof;
      await setDoc(doc(db, "professionals", prof.id), profileData);
      
      // Save initial services if any
      if (services && services.length > 0) {
        for (const svc of services) {
          await setDoc(doc(db, "professionals", prof.id, "services", svc.id), {
            name: svc.name,
            price: svc.price,
            unit: svc.unit,
            description: svc.description
          });
        }
      }
      return;
    } catch (err) {
      console.error("Firestore createProfessional error:", err);
    }
  }
  
  // Fallback
  if (typeof window !== "undefined") {
    const { services, ...profileData } = prof;
    localStorage.setItem("central_profile", JSON.stringify(profileData));
    localStorage.setItem(`central_profile_${prof.id}`, JSON.stringify(profileData));
    if (services) {
      localStorage.setItem("central_services", JSON.stringify(services));
      localStorage.setItem(`central_services_${prof.id}`, JSON.stringify(services));
    }
  }
}

// Update professional profile fields
export async function saveProfessionalProfile(profId: string, profileData: Partial<Professional>): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const { services, ...cleanData } = profileData as any;
      await updateDoc(doc(db, "professionals", profId), cleanData);
      return;
    } catch (err) {
      console.error("Firestore saveProfessionalProfile error:", err);
    }
  }
  
  // Fallback
  if (typeof window !== "undefined") {
    const localProfile = localStorage.getItem(`central_profile_${profId}`) || localStorage.getItem("central_profile");
    const current = localProfile ? JSON.parse(localProfile) : mockProfessionals[0];
    const updated = { ...current, ...profileData };
    localStorage.setItem("central_profile", JSON.stringify(updated));
    localStorage.setItem(`central_profile_${profId}`, JSON.stringify(updated));
  }
}

// Check if username (slug) is available
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "professionals"), where("username", "==", cleanUsername));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (err) {
      console.error("Firestore checkUsernameAvailable error:", err);
    }
  }
  
  // Fallback
  const existsInMocks = mockProfessionals.some(p => p.username === cleanUsername);
  if (existsInMocks) return false;
  
  if (typeof window !== "undefined") {
    const localProfile = localStorage.getItem("central_profile");
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      if (parsed.username === cleanUsername) return false;
    }
  }
  return true;
}

// Get all professionals for directory listing
export async function getAllProfessionals(): Promise<Professional[]> {
  let list: Professional[] = [];
  
  if (isFirebaseConfigured && db) {
    const firestore = db;
    try {
      const querySnapshot = await getDocs(collection(firestore, "professionals"));
      const professionalsPromises = querySnapshot.docs.map(async (d) => {
        const docData = d.data();
        
        // Fetch services and products in parallel
        const [servicesSnapshot, productsSnapshot] = await Promise.all([
          getDocs(collection(firestore, "professionals", d.id, "services")),
          getDocs(collection(firestore, "professionals", d.id, "products")).catch(e => {
            console.error("Error fetching products subcollection:", e);
            return { docs: [] } as any;
          })
        ]);
        
        const services = servicesSnapshot.docs.map((s: any) => ({ id: s.id, ...s.data() } as Service));
        const products = productsSnapshot.docs.map((p: any) => ({ id: p.id, ...p.data() } as Product));
        
        return {
          id: d.id,
          username: docData.username,
          name: docData.name,
          title: docData.title,
          category: docData.category,
          city: docData.city,
          rating: docData.rating || 5.0,
          reviewsCount: docData.reviewsCount || 1,
          avatarColor: docData.avatarColor || "linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))",
          bio: docData.bio,
          whatsapp: docData.whatsapp,
          gallery: docData.gallery || [],
          services,
          products,
          logoUrl: docData.logoUrl || "",
          pixKeyType: docData.pixKeyType || "",
          pixKey: docData.pixKey || "",
          cardDesign: docData.cardDesign || undefined,
          stripeAccountId: docData.stripeAccountId || "",
          stripeConnectionStatus: docData.stripeConnectionStatus || ""
        } as Professional;
      });
      
      list = await Promise.all(professionalsPromises);
      return list;
    } catch (err) {
      console.error("Firestore getAllProfessionals error:", err);
    }
  }
  
  // LocalStorage / Mock fallback: Load any custom profiles created locally
  list = [...mockProfessionals];
  
  if (typeof window !== "undefined") {
    // 1. Look for central_profile
    const localProfile = localStorage.getItem("central_profile");
    if (localProfile) {
      try {
        const profile = JSON.parse(localProfile);
        const servicesKey = `central_services_${profile.id}`;
        const localServices = localStorage.getItem(servicesKey) || localStorage.getItem("central_services");
        const services = localServices ? JSON.parse(localServices) : [];
        
        const productsKey = `central_products_${profile.id}`;
        const localProducts = localStorage.getItem(productsKey) || localStorage.getItem("central_products");
        const products = localProducts ? JSON.parse(localProducts) : [];
        
        const fullProfile = { ...profile, services, products };
        const idx = list.findIndex(p => p.id === profile.id || p.username === profile.username);
        if (idx !== -1) {
          list[idx] = fullProfile;
        } else {
          list.unshift(fullProfile);
        }
      } catch (e) {
        console.error("Error parsing local profile in list:", e);
      }
    }
    
    // 2. Look for any other central_profile_{id}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("central_profile_")) {
        try {
          const profile = JSON.parse(localStorage.getItem(key) || "");
          const servicesKey = `central_services_${profile.id}`;
          const localServices = localStorage.getItem(servicesKey);
          const services = localServices ? JSON.parse(localServices) : [];
          
          const productsKey = `central_products_${profile.id}`;
          const localProducts = localStorage.getItem(productsKey);
          const products = localProducts ? JSON.parse(localProducts) : [];
          
          const fullProfile = { ...profile, services, products };
          const idx = list.findIndex(p => p.id === profile.id || p.username === profile.username);
          if (idx !== -1) {
            list[idx] = fullProfile;
          } else {
            list.unshift(fullProfile);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 3. For any professional in the list (custom or mock), load products/services from their specific localStorage if present
    list = list.map(p => {
      const localServices = localStorage.getItem(`central_services_${p.id}`);
      const localProducts = localStorage.getItem(`central_products_${p.id}`);
      
      return {
        ...p,
        services: localServices ? JSON.parse(localServices) : p.services,
        products: localProducts ? JSON.parse(localProducts) : (p.products || [])
      };
    });
  }
  
  return list;
}


// Get professional by username
export async function getProfessional(username: string): Promise<Professional | null> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "professionals"), where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const docData = docSnap.data();
        
        // Load services and products subcollections in parallel!
        const [servicesSnapshot, productsSnapshot] = await Promise.all([
          getDocs(collection(db, "professionals", docSnap.id, "services")),
          getDocs(collection(db, "professionals", docSnap.id, "products")).catch(e => {
            console.error("Firestore products subcollection error:", e);
            return { docs: [] } as any;
          })
        ]);
        
        const services = servicesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Service));
        const products = productsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));
        
        return {
          id: docSnap.id,
          username: docData.username,
          name: docData.name,
          title: docData.title,
          category: docData.category,
          city: docData.city,
          rating: docData.rating || 5.0,
          reviewsCount: docData.reviewsCount || 1,
          avatarColor: docData.avatarColor || "linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))",
          bio: docData.bio,
          whatsapp: docData.whatsapp,
          gallery: docData.gallery || [],
          services,
          products,
          logoUrl: docData.logoUrl || "",
          pixKeyType: docData.pixKeyType || "",
          pixKey: docData.pixKey || "",
          cardDesign: docData.cardDesign || undefined,
          stripeAccountId: docData.stripeAccountId || "",
          stripeConnectionStatus: docData.stripeConnectionStatus || ""
        } as Professional;
      }
      return null;
    } catch (err) {
      console.error("Firestore getProfessional error:", err);
    }
  }
  
  // LocalStorage / Mock fallback
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("central_profile_")) {
        try {
          const profile = JSON.parse(localStorage.getItem(key) || "");
          if (profile.username === username) {
            const servicesKey = `central_services_${profile.id}`;
            const localServices = localStorage.getItem(servicesKey);
            const services = localServices ? JSON.parse(localServices) : [];
            
            const productsKey = `central_products_${profile.id}`;
            const localProducts = localStorage.getItem(productsKey);
            const products = localProducts ? JSON.parse(localProducts) : [];
            
            return { ...profile, services, products };
          }
        } catch (e) {
          // ignore
        }
      }
    }
    
    // Also fallback to the default central_profile
    const localProfile = localStorage.getItem("central_profile");
    if (localProfile) {
      try {
        const parsed = JSON.parse(localProfile);
        if (parsed.username === username) {
          const localServices = localStorage.getItem("central_services");
          const services = localServices ? JSON.parse(localServices) : [];
          
          const localProducts = localStorage.getItem("central_products");
          const products = localProducts ? JSON.parse(localProducts) : [];
          
          return { ...parsed, services, products };
        }
      } catch (e) {}
    }
  }

  const found = mockProfessionals.find(p => p.username === username);
  if (found) {
    if (typeof window !== "undefined") {
      const localServices = localStorage.getItem(`central_services_${found.id}`) || localStorage.getItem("central_services");
      const localProducts = localStorage.getItem(`central_products_${found.id}`) || localStorage.getItem("central_products");
      const services = localServices ? JSON.parse(localServices) : found.services;
      const products = localProducts ? JSON.parse(localProducts) : [];
      return { ...found, services, products };
    }
    return found;
  }
  return null;
}

// Get leads for the dashboard
export async function getLeads(profId: string): Promise<Lead[]> {
  if (isFirebaseConfigured && db) {
    try {
      const leadsSnapshot = await getDocs(collection(db, "professionals", profId, "leads"));
      return leadsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
    } catch (err) {
      console.error("Firestore getLeads error:", err);
    }
  }
  
  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const localLeads = localStorage.getItem(`central_leads_${profId}`) || localStorage.getItem("central_leads");
    if (localLeads) return JSON.parse(localLeads);
  }
  return [];
}

// Save lead
export async function saveLead(profUsername: string, lead: Lead): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "professionals"), where("username", "==", profUsername));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const profId = querySnapshot.docs[0].id;
        const leadRef = doc(db, "professionals", profId, "leads", lead.id);
        await setDoc(leadRef, {
          clientName: lead.clientName,
          clientPhone: lead.clientPhone,
          serviceName: lead.serviceName,
          status: lead.status,
          createdAt: lead.createdAt,
          notes: lead.notes
        });
        return;
      }
    } catch (err) {
      console.error("Firestore saveLead error:", err);
    }
  }
  
  // LocalStorage fallback
  if (typeof window !== "undefined") {
    let profId = "prof_1";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("central_profile_")) {
        try {
          const profile = JSON.parse(localStorage.getItem(key) || "");
          if (profile.username === profUsername) {
            profId = profile.id;
            break;
          }
        } catch (e) {}
      }
    }
    const localLeads = localStorage.getItem(`central_leads_${profId}`) || localStorage.getItem("central_leads");
    const currentLeads: Lead[] = localLeads ? JSON.parse(localLeads) : [];
    currentLeads.unshift(lead);
    localStorage.setItem("central_leads", JSON.stringify(currentLeads));
    localStorage.setItem(`central_leads_${profId}`, JSON.stringify(currentLeads));
  }
}

// Update lead status
export async function updateLeadStatus(profId: string, leadId: string, status: Lead["status"]): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const leadRef = doc(db, "professionals", profId, "leads", leadId);
      await updateDoc(leadRef, { status });
      return;
    } catch (err) {
      console.error("Firestore updateLeadStatus error:", err);
    }
  }
  
  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const localLeads = localStorage.getItem(`central_leads_${profId}`) || localStorage.getItem("central_leads");
    if (localLeads) {
      const currentLeads: Lead[] = JSON.parse(localLeads);
      const updated = currentLeads.map(l => l.id === leadId ? { ...l, status } : l);
      localStorage.setItem("central_leads", JSON.stringify(updated));
      localStorage.setItem(`central_leads_${profId}`, JSON.stringify(updated));
    }
  }
}

// Save/Add Service to Catalog
export async function saveService(profId: string, service: Service): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const serviceRef = doc(db, "professionals", profId, "services", service.id);
      await setDoc(serviceRef, {
        name: service.name,
        price: service.price,
        unit: service.unit,
        description: service.description
      });
      return;
    } catch (err) {
      console.error("Firestore saveService error:", err);
    }
  }
  
  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const localServices = localStorage.getItem(`central_services_${profId}`) || localStorage.getItem("central_services");
    const currentServices: Service[] = localServices ? JSON.parse(localServices) : [];
    currentServices.push(service);
    localStorage.setItem("central_services", JSON.stringify(currentServices));
    localStorage.setItem(`central_services_${profId}`, JSON.stringify(currentServices));
  }
}

// Delete Service
export async function deleteService(profId: string, serviceId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const serviceRef = doc(db, "professionals", profId, "services", serviceId);
      await deleteDoc(serviceRef);
      return;
    } catch (err) {
      console.error("Firestore deleteService error:", err);
    }
  }
  
  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const localServices = localStorage.getItem(`central_services_${profId}`) || localStorage.getItem("central_services");
    if (localServices) {
      const currentServices: Service[] = JSON.parse(localServices);
      const updated = currentServices.filter(s => s.id !== serviceId);
      localStorage.setItem("central_services", JSON.stringify(updated));
      localStorage.setItem(`central_services_${profId}`, JSON.stringify(updated));
    }
  }
}

export interface Review {
  id: string;
  clientName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
}

// Get reviews for a professional
export async function getReviews(profId: string): Promise<Review[]> {
  if (isFirebaseConfigured && db) {
    try {
      const reviewsSnapshot = await getDocs(collection(db, "professionals", profId, "reviews"));
      const reviews = reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      // Sort reviews by date descending
      return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error("Firestore getReviews error:", err);
    }
  }

  // LocalStorage / Mock fallback
  if (typeof window !== "undefined") {
    const localReviews = localStorage.getItem(`reviews_${profId}`);
    if (localReviews) {
      return JSON.parse(localReviews);
    }
  }

  // Initial mock reviews depending on the professional
  if (profId === "prof_1") {
    return [
      {
        id: "rev_1",
        clientName: "Ana Clara",
        rating: 5,
        comment: "Excelente trabalho! Pintura perfeita, sem sujeira e dentro do prazo combinado. Recomendo muito!",
        createdAt: "2026-06-15T10:00:00Z"
      },
      {
        id: "rev_2",
        clientName: "Bruno Souza",
        rating: 4,
        comment: "Muito atencioso, caprichoso nos detalhes. O cimento queimado ficou lindo.",
        createdAt: "2026-06-10T14:30:00Z"
      }
    ];
  }
  return [];
}

// Save review and update average rating in professional profile
export async function saveReview(profId: string, review: Review): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const reviewRef = doc(db, "professionals", profId, "reviews", review.id);
      await setDoc(reviewRef, {
        clientName: review.clientName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      });

      // Recalculate average rating and reviewsCount
      const reviewsSnapshot = await getDocs(collection(db, "professionals", profId, "reviews"));
      const reviews = reviewsSnapshot.docs.map(d => d.data() as Review);
      
      const count = reviews.length;
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = count > 0 ? parseFloat((sum / count).toFixed(1)) : 5.0;

      await updateDoc(doc(db, "professionals", profId), {
        rating: avg,
        reviewsCount: count
      });
      return;
    } catch (err) {
      console.error("Firestore saveReview error:", err);
    }
  }

  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const localReviews = localStorage.getItem(`reviews_${profId}`);
    const currentReviews: Review[] = localReviews ? JSON.parse(localReviews) : [];
    
    // Check if we have mock reviews already to initialize if empty
    if (currentReviews.length === 0 && profId === "prof_1") {
      currentReviews.push(
        {
          id: "rev_1",
          clientName: "Ana Clara",
          rating: 5,
          comment: "Excelente trabalho! Pintura perfeita, sem sujeira e dentro do prazo combinado. Recomendo muito!",
          createdAt: "2026-06-15T10:00:00Z"
        },
        {
          id: "rev_2",
          clientName: "Bruno Souza",
          rating: 4,
          comment: "Muito atencioso, caprichoso nos detalhes. O cimento queimado ficou lindo.",
          createdAt: "2026-06-10T14:30:00Z"
        }
      );
    }

    currentReviews.unshift(review);
    localStorage.setItem(`reviews_${profId}`, JSON.stringify(currentReviews));

    // Update rating in local profile if matches
    const localProfile = localStorage.getItem("central_profile");
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      if (parsed.id === profId) {
        const count = currentReviews.length;
        const sum = currentReviews.reduce((acc, r) => acc + r.rating, 0);
        const avg = count > 0 ? parseFloat((sum / count).toFixed(1)) : 5.0;
        
        parsed.rating = avg;
        parsed.reviewsCount = count;
        localStorage.setItem("central_profile", JSON.stringify(parsed));
      }
    }
  }
}

// Save review reply
export async function saveReviewReply(profId: string, reviewId: string, replyText: string): Promise<void> {
  const repliedAt = new Date().toISOString();
  if (isFirebaseConfigured && db) {
    try {
      const reviewRef = doc(db, "professionals", profId, "reviews", reviewId);
      await updateDoc(reviewRef, {
        reply: replyText,
        repliedAt: repliedAt
      });
      return;
    } catch (err) {
      console.error("Firestore saveReviewReply error:", err);
    }
  }

  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const localReviews = localStorage.getItem(`reviews_${profId}`);
    let currentReviews: Review[] = localReviews ? JSON.parse(localReviews) : [];
    
    // Check if we have mock reviews already to initialize if empty
    if (currentReviews.length === 0 && profId === "prof_1") {
      currentReviews = [
        {
          id: "rev_1",
          clientName: "Ana Clara",
          rating: 5,
          comment: "Excelente trabalho! Pintura perfeita, sem sujeira e dentro do prazo combinado. Recomendo muito!",
          createdAt: "2026-06-15T10:00:00Z"
        },
        {
          id: "rev_2",
          clientName: "Bruno Souza",
          rating: 4,
          comment: "Muito atencioso, caprichoso nos detalhes. O cimento queimado ficou lindo.",
          createdAt: "2026-06-10T14:30:00Z"
        }
      ];
    }

    const updated = currentReviews.map(r => {
      if (r.id === reviewId) {
        return { ...r, reply: replyText, repliedAt };
      }
      return r;
    });

    localStorage.setItem(`reviews_${profId}`, JSON.stringify(updated));
  }
}

// Estimate Management
export interface Estimate {
  id: string;
  clientName: string;
  clientPhone: string;
  date: string;
  validityDays: number;
  notes: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  status: "pendente" | "aprovado" | "recusado";
  createdAt: string;
}

export async function getEstimates(profId: string): Promise<Estimate[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, "professionals", profId, "estimates"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Estimate));
    } catch (err) {
      console.error("Firestore getEstimates error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const localEstimates = localStorage.getItem(`central_estimates_${profId}`);
    if (localEstimates) {
      return JSON.parse(localEstimates);
    }
  }
  return [];
}

export async function saveEstimate(profId: string, estimate: Estimate): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "estimates", estimate.id);
      await setDoc(ref, estimate);
      return;
    } catch (err) {
      console.error("Firestore saveEstimate error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_estimates_${profId}`;
    const local = localStorage.getItem(key);
    const list: Estimate[] = local ? JSON.parse(local) : [];
    list.unshift(estimate);
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export async function updateEstimateStatus(profId: string, estimateId: string, status: Estimate["status"]): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "estimates", estimateId);
      await updateDoc(ref, { status });
      return;
    } catch (err) {
      console.error("Firestore updateEstimateStatus error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_estimates_${profId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const list: Estimate[] = JSON.parse(local);
      const updated = list.map(item => item.id === estimateId ? { ...item, status } : item);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }
}

export async function deleteEstimate(profId: string, estimateId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "estimates", estimateId);
      await deleteDoc(ref);
      return;
    } catch (err) {
      console.error("Firestore deleteEstimate error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_estimates_${profId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const list: Estimate[] = JSON.parse(local);
      const updated = list.filter(item => item.id !== estimateId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }
}

// Receipt Management
export interface Receipt {
  id: string;
  value: number;
  clientName: string;
  referente: string;
  date: string;
  createdAt: string;
}

export async function getReceipts(profId: string): Promise<Receipt[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, "professionals", profId, "receipts"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Receipt));
    } catch (err) {
      console.error("Firestore getReceipts error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const localReceipts = localStorage.getItem(`central_receipts_${profId}`);
    if (localReceipts) {
      return JSON.parse(localReceipts);
    }
  }
  return [];
}

export async function saveReceipt(profId: string, receipt: Receipt): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "receipts", receipt.id);
      await setDoc(ref, receipt);
      return;
    } catch (err) {
      console.error("Firestore saveReceipt error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_receipts_${profId}`;
    const local = localStorage.getItem(key);
    const list: Receipt[] = local ? JSON.parse(local) : [];
    list.unshift(receipt);
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export async function deleteReceipt(profId: string, receiptId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "receipts", receiptId);
      await deleteDoc(ref);
      return;
    } catch (err) {
      console.error("Firestore deleteReceipt error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_receipts_${profId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const list: Receipt[] = JSON.parse(local);
      const updated = list.filter(item => item.id !== receiptId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }
}

// Expense CRUD operations
export async function getExpenses(profId: string): Promise<Expense[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, "professionals", profId, "expenses"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
    } catch (err) {
      console.error("Firestore getExpenses error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const localExpenses = localStorage.getItem(`central_expenses_${profId}`);
    if (localExpenses) {
      return JSON.parse(localExpenses);
    }
  }
  return [];
}

export async function saveExpense(profId: string, expense: Expense): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "expenses", expense.id);
      await setDoc(ref, expense);
      return;
    } catch (err) {
      console.error("Firestore saveExpense error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_expenses_${profId}`;
    const local = localStorage.getItem(key);
    const list: Expense[] = local ? JSON.parse(local) : [];
    list.unshift(expense);
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export async function deleteExpense(profId: string, expenseId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "expenses", expenseId);
      await deleteDoc(ref);
      return;
    } catch (err) {
      console.error("Firestore deleteExpense error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_expenses_${profId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const list: Expense[] = JSON.parse(local);
      const updated = list.filter(item => item.id !== expenseId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }
}

// Appointment CRUD operations
export async function getAppointments(profId: string): Promise<Appointment[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, "professionals", profId, "appointments"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
    } catch (err) {
      console.error("Firestore getAppointments error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(`central_appointments_${profId}`);
    if (local) {
      return JSON.parse(local);
    }
  }
  return [];
}

export async function saveAppointment(profId: string, appt: Appointment): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "appointments", appt.id);
      await setDoc(ref, appt);
      return;
    } catch (err) {
      console.error("Firestore saveAppointment error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_appointments_${profId}`;
    const local = localStorage.getItem(key);
    const list: Appointment[] = local ? JSON.parse(local) : [];
    const index = list.findIndex(item => item.id === appt.id);
    if (index >= 0) {
      list[index] = appt;
    } else {
      list.unshift(appt);
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export async function deleteAppointment(profId: string, apptId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "appointments", apptId);
      await deleteDoc(ref);
      return;
    } catch (err) {
      console.error("Firestore deleteAppointment error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_appointments_${profId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const list: Appointment[] = JSON.parse(local);
      const updated = list.filter(item => item.id !== apptId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }
}

// Product CRUD operations
export async function getProducts(profId: string): Promise<Product[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, "professionals", profId, "products"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    } catch (err) {
      console.error("Firestore getProducts error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(`central_products_${profId}`);
    if (local) {
      return JSON.parse(local);
    }
  }
  return [];
}

export async function saveProduct(profId: string, prod: Product): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "products", prod.id);
      await setDoc(ref, prod);
      return;
    } catch (err) {
      console.error("Firestore saveProduct error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_products_${profId}`;
    const local = localStorage.getItem(key);
    const list: Product[] = local ? JSON.parse(local) : [];
    const index = list.findIndex(item => item.id === prod.id);
    if (index >= 0) {
      list[index] = prod;
    } else {
      list.unshift(prod);
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export async function deleteProduct(profId: string, prodId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "professionals", profId, "products", prodId);
      await deleteDoc(ref);
      return;
    } catch (err) {
      console.error("Firestore deleteProduct error:", err);
    }
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    const key = `central_products_${profId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const list: Product[] = JSON.parse(local);
      const updated = list.filter(item => item.id !== prodId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }
}
