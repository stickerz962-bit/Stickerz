import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { firebaseAuth, firebaseConfigured, firestore } from './firebase';

export type CategoryId = 'school' | 'gifts' | 'bundles' | 'coloring' | 'moms' | 'party';
export type Product = {
  id: string;
  name: string;
  price: number;
  category: CategoryId;
  description: string;
  image?: string;
  imageUrl?: string;
  active: boolean;
};

function fromDocument(id: string, data: DocumentData): Product | null {
  const categories: CategoryId[] = ['school', 'gifts', 'bundles', 'coloring', 'moms', 'party'];
  if (typeof data.name !== 'string' || typeof data.price !== 'number' ||
      !categories.includes(data.category) || typeof data.active !== 'boolean') return null;
  return {
    id, name: data.name, price: data.price, category: data.category,
    description: typeof data.description === 'string' ? data.description : '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    active: data.active,
  };
}

export function subscribeToActiveProducts(
  onProducts: (products: Product[]) => void,
  onError: (error: Error) => void,
): () => void {
  if (!firebaseConfigured || !firestore) {
    onError(new Error('Firebase غير مُعدّ لهذا البناء.'));
    return () => undefined;
  }
  // The query is deliberately constrained to active products so it matches Firestore rules.
  return onSnapshot(query(collection(firestore, 'products'), where('active', '==', true)), snapshot => {
    onProducts(snapshot.docs.map(doc => fromDocument(doc.id, doc.data())).filter((p): p is Product => p !== null));
  }, error => onError(error));
}

export function observeAuth(callback: (user: User | null) => void): () => void {
  if (!firebaseAuth) { callback(null); return () => undefined; }
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  if (!firebaseAuth) throw new Error('إعدادات Firebase غير مكتملة.');
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const token = await credential.user.getIdTokenResult(true);
  if (token.claims.admin !== true) {
    await signOut(firebaseAuth);
    throw new Error('الحساب ده مش عنده صلاحية مدير.');
  }
  return credential.user;
}

export async function hasAdminClaim(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult(true);
  return token.claims.admin === true;
}

export async function signOutAdmin(): Promise<void> {
  if (firebaseAuth) await signOut(firebaseAuth);
}
