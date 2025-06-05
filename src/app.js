// src/js/app.js

// 1) Importamos lo que necesitamos desde solana.js
import {
  isPhantomInstalled,
  connectWallet,
  getConnectedPublicKey,
  sendSolToPool
} from "./solana.js";


// 2) Referencias del DOM (IDs en public/index.html)
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletAddressSpan = document.getElementById("walletAddress");
const betSection = document.getElementById("bet-section");
const betForm = document.getElementById("betForm");
const betAmountInput = document.getElementById("betAmount");
const placeBetBtn = document.getElementById("placeBetBtn");
const currentPoolP = document.getElementById("currentPool");
const timerSpan = document.getElementById("timeLeft");
const rouletteSection = document.getElementById("roulette-section");
const rouletteCanvas = document.getElementById("rouletteCanvas");
const spinBtn = document.getElementById("spinBtn");
const winnerMessageP = document.getElementById("winnerMessage");


// 3) Estado de la partida
let bets = [];          // Array de objetos { address: PublicKey, amount: number }
let poolTotal = 0;      // La cantidad total (en SOL) acumulada en el pool
let countdown = 30;     // Temporizador (en segundos) por ronda
let intervalId = null;  // guardamos el setInterval para luego pararlo


/**
 * Muestra la sección de apuestas y arranca el temporizador de 30 segundos.
 */
function startBettingRound() {
  // 4.1) Quitar la clase "hidden" para que aparezca el formulario
  betSection.classList.remove("hidden");

  // 4.2) Actualizar el texto del pool y el timer en pantalla
  currentPoolP.textContent = `Pool actual: ${poolTotal} SOL`;
  timerSpan.textContent = countdown;

  // 4.3) Iniciar el setInterval para ir descontando segundos
  intervalId = setInterval(() => {
    countdown--;
    timerSpan.textContent = countdown;
    // Cuando llegue a 0, paramos el temporizador y finalizamos la ronda
    if (countdown <= 0) {
      clearInterval(intervalId);
      endBettingRound();
    }
  }, 1000);
}


/**
 * Termina la ronda de apuestas: se deshabilita el formulario y se muestra la ruleta.
 */
function endBettingRound() {
  // 5.1) Deshabilitar el botón y el input de apuesta
  placeBetBtn.disabled = true;
  betAmountInput.disabled = true;

  // 5.2) Hacer visible la sección de la ruleta
  rouletteSection.classList.remove("hidden");

  // 5.3) Dibujar la ruleta ahora que ya tenemos el array "bets"
  drawRoulette();

  // 5.4) Habilitar el botón de “Girar Ruleta”
  spinBtn.disabled = false;
}


/**
 * Dibuja la ruleta en el canvas según los montos apostados.
 * Cada segmento es proporcional al SOL apostado.
 */
function drawRoulette() {
  const ctx = rouletteCanvas.getContext("2d");
  const centerX = rouletteCanvas.width / 2;
  const centerY = rouletteCanvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  // 6.1) Calculamos la suma total de todas las apuestas
  const totalAmount = bets.reduce((acc, b) => acc + b.amount, 0);
  let startAngle = 0;

  // 6.2) Definimos un array de colores (para alternar los segmentos)
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#8AFF33", "#FF5733", "#33FFF3"];

  // 6.3) Recorremos cada apuesta (bets[i]) y dibujamos un “slice” de la ruleta
  bets.forEach((bet, idx) => {
    // El ángulo de este segmento es (bet.amount / totalAmount) * 2π
    const sliceAngle = (bet.amount / totalAmount) * 2 * Math.PI;

    // 6.3.1) Dibujar el sector (círculo) desde startAngle hasta startAngle + sliceAngle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[idx % colors.length]; // cada segmento un color distinto
    ctx.fill();

    // 6.3.2) Dibujar el borde blanco
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6.3.3) Opcional: dibujar el porcentaje o etiqueta en el medio del slice
    const midAngle = startAngle + sliceAngle / 2;
    const labelX = centerX + (radius / 2) * Math.cos(midAngle);
    const labelY = centerY + (radius / 2) * Math.sin(midAngle);
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    const percentage = ((bet.amount / totalAmount) * 100).toFixed(1) + "%";
    ctx.fillText(percentage, labelX - 15, labelY);

    // 6.3.4) Actualizamos startAngle para el siguiente segmento
    startAngle += sliceAngle;
  });
}


/**
 * Gira la ruleta de forma animada y selecciona un ganador aleatorio ponderado.
 */
function spinRoulette() {
  spinBtn.disabled = true;  // deshabilitamos el botón para que no lo aprieten de nuevo
  const ctx = rouletteCanvas.getContext("2d");
  const centerX = rouletteCanvas.width / 2;
  const centerY = rouletteCanvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  // 7.1) Calculamos de nuevo el total (por si cambió, aunque no debería)
  const totalAmount = bets.reduce((acc, b) => acc + b.amount, 0);

  // 7.2) Generamos un número aleatorio entre 0 y totalAmount
  const rand = Math.random() * totalAmount;

  // 7.3) Determinamos qué índice “i” corresponde a ese número aleatorio
  let cumulative = 0;
  let winnerIndex = -1;
  for (let i = 0; i < bets.length; i++) {
    cumulative += bets[i].amount;
    if (rand <= cumulative) {
      winnerIndex = i;
      break;
    }
  }
  const winnerAddress = bets[winnerIndex].address; // clave pública ganadora

  // 7.4) Queremos animar la ruleta para que, al detenerse, el “puntero” quede sobre winnerIndex
  // Calculamos cuántos grados totales debe rotar:
  //    360° × 5 vueltas completas + (ángulo medio del segmento ganador – 90°)
  // El “– 90°” es porque asumimos que el puntero está en la parte superior o “12 en punto”
  const totalRotation = 360 * 5 + (cumulativeAngleForIndex(winnerIndex, bets) - 90);

  const animationDuration = 3000; // 3 segundos
  const startTime = performance.now();

  // 7.5) Función recursiva para animar la rotación con requestAnimationFrame
  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    // “easeOutCubic” para que el giro frene de manera suave
    const rotation = easeOutCubic(progress) * totalRotation;

    // 7.6) Limpiar canvas
    ctx.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);

    // 7.7) Rotar el canvas en torno al centro
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // 7.8) Volvemos a dibujar la ruleta en la nueva posición rotada
    drawRoulette();
    ctx.restore();

    if (progress < 1) {
      // Si aún no llegamos al 100 % del tiempo, seguimos animando
      requestAnimationFrame(animate);
    } else {
      // Cuando la animación termina, mostramos el ganador
      winnerMessageP.textContent = `¡Ganador: ${winnerAddress.toString()}!`;

      // 7.9) (Aquí podrías invocar la función que envía SOL al ganador)
      // Pero recordemos: en el frontend NUNCA exponemos la clave privada.
      // Por eso el envío real al ganador lo harías en backend (Node.js) o manualmente.
      // Ejemplo comentado:
      // await sendSolToWinner(winnerAddress, poolTotal);
    }
  }

  requestAnimationFrame(animate);
}


/**
 * Función de easing “cubic ease out”: hace que el giro vaya lento al final.
 * @param {number} t - porcentaje de avance de la animación [0,1]
 * @returns {number} valor de easing
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}


/**
 * Calcula el ángulo medio (en grados) del segmento para el índice dado.
 * @param {number} index - posición de la apuesta en el array “bets”.
 * @param {Array} bets - array de apuestas [{address, amount}, ...]
 * @returns {number} Ángulo en grados (0° es justo al este, gira antihorario).
 */
function cumulativeAngleForIndex(index, bets) {
  // 1) Suma total de las apuestas
  const total = bets.reduce((acc, b) => acc + b.amount, 0);
  let startAngle = 0;

  // 2) Calculamos cuánto “avance” (en grados) hubo antes de llegar al segmento index
  for (let i = 0; i < index; i++) {
    startAngle += (bets[i].amount / total) * 360;
  }

  // 3) El ángulo medio es “arranque” + mitad del ángulo de ese segmento
  const midAngle = startAngle + (bets[index].amount / total) * 180;
  return midAngle;
}


window.addEventListener("load", () => {
  // Si la wallet ya estaba conectada (el usuario no recargó la página)...
  if (getConnectedPublicKey()) {
    // 1) Mostramos la dirección en pantalla
    walletAddressSpan.textContent = getConnectedPublicKey().toString();
    // 2) Deshabilitamos el botón “Conectar Wallet” (porque ya está conectada)
    connectWalletBtn.disabled = true;
    // 3) Mostramos directamente la sección de apuestas y arrancamos el temporizador
    betSection.classList.remove("hidden");
    startBettingRound();
  }
});


connectWalletBtn.addEventListener("click", async () => {
  try {
    // 1) Llamamos a connectWallet(): esto abre Phantom para que el usuario Autorice
    const publicKey = await connectWallet();

    // 2) Si el usuario aprobó, mostramos su key en pantalla
    walletAddressSpan.textContent = publicKey.toString();

    // 3) Deshabilitamos el botón (para que no haga doble clic)
    connectWalletBtn.disabled = true;

    // 4) Arrancamos la ronda de apuestas
    startBettingRound();

  } catch (err) {
    // Si el usuario canceló el pop-up o no tuvo Phantom instalado, mostramos un alert
    alert("No se pudo conectar la wallet: " + err.message);
  }
});


betForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // evitamos que recargue la página

  // 1) Leemos la cantidad que el usuario ingresó
  const amount = parseFloat(betAmountInput.value);
  if (isNaN(amount) || amount <= 0) {
    alert("Ingresa una cantidad válida de SOL.");
    return;
  }

  try {
    // 2) Deshabilitamos el botón temporalmente mientras procesamos la transacción
    placeBetBtn.disabled = true;

    // 3) Llamamos a sendSolToPool(amount). Esto abrirá Phantom para firmar la transacción
    const signature = await sendSolToPool(amount);
    console.log("Transacción enviada. Signature:", signature);

    // 4) Si se confirmó, guardamos la apuesta en nuestro array local “bets”
    const playerAddress = window.solana.publicKey;
    bets.push({ address: playerAddress, amount });

    // 5) Aumentamos poolTotal y actualizamos el texto en pantalla
    poolTotal += amount;
    currentPoolP.textContent = `Pool actual: ${poolTotal.toFixed(2)} SOL`;

    // 6) Limpiamos el formulario para permitir nuevas apuestas si aún quedan segundos
    betAmountInput.value = "";
  } catch (err) {
    alert("Error al apostar: " + err.message);
  } finally {
    // 7) Siempre re-habilitamos el botón (aunque haya error)
    placeBetBtn.disabled = false;
  }
});



spinBtn.addEventListener("click", () => {
  spinRoulette();
});


