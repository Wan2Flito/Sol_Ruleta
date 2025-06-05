// src/js/solana.js

// 1) Importar el SDK de Solana
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram
} from "@solana/web3.js";

// 2) Variables globales de la dApp
const NETWORK = "devnet";                           // Estamos en Devnet (red de pruebas)
const SOLANA_RPC_ENDPOINT = clusterApiUrl(NETWORK);
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");


// 3) Clave pública de la cuenta “pool” donde almacenamos todas las apuestas
export const POOL_PUBLIC_KEY = new PublicKey(FnmdtBef99UHXWM8WsfAQ6Xw4gF8ETr1whCVvdRYjAtx);


// -------- Funciones para conectar wallet (Phantom) --------

/**
 * Detecta si hay una wallet inyectada (Phantom u otra compatible con Solana).
 * @returns {boolean}
 */
export function isPhantomInstalled() {
  return window.solana && window.solana.isPhantom;
}

/**
 * Conecta a la wallet y solicita autorización al usuario.
 * @returns {PublicKey} PublicKey del usuario en Phantom.
 * @throws Error si Phantom no está instalado o se cancela la conexión.
 */
export async function connectWallet() {
  if (!isPhantomInstalled()) {
    throw new Error("Instala Phantom o una wallet compatible.");
  }
  // Abre el pop-up de Phantom y pide permiso
  const resp = await window.solana.connect();
  // resp.publicKey es la clave pública aprobada por el usuario
  return resp.publicKey;
}

/**
 * Obtiene la PublicKey si la wallet ya está conectada de antes (sin pedir permiso de nuevo).
 * @returns {PublicKey | null} La PublicKey si está activa la conexión, o null si no.
 */
export function getConnectedPublicKey() {
  if (isPhantomInstalled() && window.solana.isConnected) {
    return window.solana.publicKey;
  }
  return null;
}



// -------- Función para enviar SOL a la cuenta pool --------

/**
 * Envía la cantidad de SOL indicada desde la wallet conectada hacia POOL_PUBLIC_KEY.
 * @param {number} amountSOL - cantidad de SOL (por ej. 0.5, 1, 2.3)
 * @returns {string} signature de transacción
 * @throws Error si Phantom no está instalado o si la wallet no está conectada
 */
export async function sendSolToPool(amountSOL) {
  if (!isPhantomInstalled()) {
    throw new Error("Phantom no está instalado.");
  }
  if (!window.solana.isConnected) {
    throw new Error("Primero conecta tu wallet.");
  }

  // 1) Obtener la PublicKey del usuario que firmará
  const senderPubKey = window.solana.publicKey;

  // 2) Construir una transacción básica de transferencia
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderPubKey,             // remitent e
      toPubkey: POOL_PUBLIC_KEY,            // destinatario
      lamports: amountSOL * LAMPORTS_PER_SOL // convertir SOL -> lamports
    })
  );

  // 3) Pedir a Phantom que firme y envíe la transacción
  const { signature } = await window.solana.signAndSendTransaction(transaction);

  // 4) Opcional: esperar a que la transacción esté “confirmada”
  await connection.confirmTransaction(signature, "confirmed");

  // 5) Devolver la firma para que el frontend pueda mostrarla/loguearla
  return signature;
}



// -------- (Opcional) Función para enviar SOL desde pool al ganador --------
// ¡Este bloque NUNCA debe usarse en producción dentro de frontend!
// En un entorno real, ejecutarías esto en Node.js en un servidor seguro.

/*
import fs from "fs";
import { Keypair } from "@solana/web3.js";

const poolSecret = JSON.parse(fs.readFileSync("/ruta/a/pool.json"));
const poolKeypair = Keypair.fromSecretKey(new Uint8Array(poolSecret));

export async function sendSolToWinner(winnerPublicKey, totalSOL) {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: poolKeypair.publicKey,
      toPubkey: new PublicKey(winnerPublicKey),
      lamports: totalSOL * LAMPORTS_PER_SOL,
    })
  );
  const signature = await connection.sendTransaction(transaction, [poolKeypair]);
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}
*/
