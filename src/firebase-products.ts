import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseAuth, firebaseConfigured, firestore, firebaseStorage } from './firebase';

export type CategoryId = 'school' | 'gifts' | 'bundles' | 'coloring' | 'moms' | 'party';
export type Product = {
  id: string; name: string; price: number; category: CategoryId; description: string;
  imageUrl?: string; sku?: string; stock?: number; featured?: boolean; active: boolean; updatedAt?: unknown;
};
export type ProductInput = Omit<Product, 'id' | 'updatedAt'>;

const categories: CategoryId[] = ['school', 'gifts', 'bundles', 'coloring', 'moms', 'party'];
function fromDocument(id: string, data: DocumentData): Product | null {
  if (typeof data.name !== 'string' || data.name.length > 100 ||
      typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0 ||
      !categories.includes(data.category) || typeof data.active !== 'boolean') return null;
  return { id, name: data.name, price: data.price, category: data.category,
    description: typeof data.description === 'string' ? data.description : '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    sku: typeof data.sku === 'string' ? data.sku : '',
    stock: typeof data.stock === 'number' && data.stock >= 0 ? data.stock : 0,
    featured: data.featured === true, active: data.active, updatedAt: data.updatedAt };
}
function requireServices() {
  if (!firebaseConfigured || !firestore || !firebaseStorage || !firebaseAuth) throw new Error('إعدادات Firebase غير مكتملة.');
  return { db: firestore, storage: firebaseStorage };
}
export function subscribeToActiveProducts(onProducts: (products: Product[]) => void, onError: (error: Error) => void): () => void {
  if (!firebaseConfigured || !firestore) { onError(new Error('Firebase غير مُعدّ لهذا البناء.')); return () => undefined; }
  return onSnapshot(query(collection(firestore, 'products'), where('active', '==', true)), snapshot => {
    onProducts(snapshot.docs.map(d => fromDocument(d.id, d.data())).filter((p): p is Product => p !== null));
  }, error => onError(error));
}
export function subscribeToAllProducts(onProducts: (products: Product[]) => void, onError: (error: Error) => void): () => void {
  if (!firebaseConfigured || !firestore) { onError(new Error('Firebase غير مُعدّ لهذا البناء.')); return () => undefined; }
  return onSnapshot(query(collection(firestore, 'products')), snapshot => {
    onProducts(snapshot.docs.map(d => fromDocument(d.id, d.data())).filter((p): p is Product => p !== null));
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
  if (token.claims.admin !== true) { await signOut(firebaseAuth); throw new Error('الحساب ده مش عنده صلاحية مدير.'); }
  return credential.user;
}
export async function hasAdminClaim(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult(true); return token.claims.admin === true;
}
export async function signOutAdmin(): Promise<void> { if (firebaseAuth) await signOut(firebaseAuth); }
export async function uploadProductImage(file: File): Promise<string> {
  const { storage } = requireServices();
  if (!file.type.startsWith('image/') || file.size >= 5 * 1024 * 1024) throw new Error('اختار صورة أقل من 5 ميجابايت.');
  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'img';
  const imageRef = ref(storage, 'product-images/' + crypto.randomUUID() + '.' + extension);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
}
export async function saveProduct(input: ProductInput, id?: string): Promise<string> {
  const { db } = requireServices();
  if (!input.name.trim() || input.name.length > 100 || !Number.isFinite(input.price) || input.price < 0 ||
      !categories.includes(input.category) || input.description.length > 500) throw new Error('راجع اسم المنتج والسعر والتصنيف والوصف.');
  const productId = id || crypto.randomUUID();
  const data = { name: input.name.trim(), price: input.price, category: input.category,
    description: input.description.trim(), imageUrl: input.imageUrl || '',
    sku: (input.sku || '').trim().slice(0, 60), stock: Number.isInteger(input.stock) && (input.stock ?? 0) >= 0 ? input.stock : 0,
    featured: input.featured === true, active: input.active, updatedAt: serverTimestamp() };
  await setDoc(doc(db, 'products', productId), data, { merge: true });
  return productId;
}
export async function setProductActive(id: string, active: boolean): Promise<void> {
  const { db } = requireServices(); await updateDoc(doc(db, 'products', id), { active, updatedAt: serverTimestamp() });
}
export async function removeProduct(id: string): Promise<void> {
  const { db } = requireServices(); await deleteDoc(doc(db, 'products', id));
}
