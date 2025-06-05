// payWinner.js

import fs from "fs";
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import readline from "readline";

// Ruta al archivo pool.json (clave privada del pool)
const POOL_KEYPAIR_PATH = "./pool.json";
const NETWORK = "devnet"; // Cambia a "mainnet-beta" en producción
const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");

// Cargar keypair del pool
function loadPoolKeypair() {
  const secret = JSON.parse(fs.readFileSync(POOL_KEYPAIR_PATH));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

// Pedir al usuario la dirección ganadora y el monto a enviar (en SOL)
async function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  try {
    const poolKeypair = loadPoolKeypair();
    const winnerAddr = await promptUser("Ingresa la dirección pública del ganador: ");
    const amountStr = await promptUser("Ingresa el monto a enviar (en SOL): ");
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.error("Monto inválido.");
      process.exit(1);
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: poolKeypair.publicKey,
        toPubkey: new PublicKey(winnerAddr),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await connection.sendTransaction(tx, [poolKeypair]);
    console.log("Transacción enviada. Signature:", signature);
    await connection.confirmTransaction(signature, "confirmed");
    console.log("Transacción confirmada. El ganador recibió sus SOL.");
  } catch (err) {
    console.error("Error al enviar premio:", err);
  }
}

main();
