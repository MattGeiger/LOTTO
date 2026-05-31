/* ── Zombie Attack! – Sprite assets ──
 *
 * NES-era PNG sprites (32×32 characters, 128×128 helicopter). Statically
 * imported so Next bundles + serves them, then preloaded into Image objects for
 * canvas `drawImage`. The renderer looks images up from the loaded structure.
 */

import zOneWalk1 from "./assets/zombies/walk/zombie-one-walk-1.png";
import zOneWalk2 from "./assets/zombies/walk/zombie-one-walk-2.png";
import zTwoWalk1 from "./assets/zombies/walk/zombie-two-walk-1.png";
import zTwoWalk2 from "./assets/zombies/walk/zombie-two-walk-2.png";
import zThreeWalk1 from "./assets/zombies/walk/zombie-three-walk-1.png";
import zThreeWalk2 from "./assets/zombies/walk/zombie-three-walk-2.png";
import zFourWalk1 from "./assets/zombies/walk/zombie-four-walk-1.png";
import zFourWalk2 from "./assets/zombies/walk/zombie-four-walk-2.png";

import zOneDeath1 from "./assets/zombies/death/zombie-one-death-1.png";
import zOneDeath2 from "./assets/zombies/death/zombie-one-death-2.png";
import zTwoDeath1 from "./assets/zombies/death/zombie-two-death-1.png";
import zTwoDeath2 from "./assets/zombies/death/zombie-two-death-2.png";
import zThreeDeath1 from "./assets/zombies/death/zombie-three-death-1.png";
import zThreeDeath2 from "./assets/zombies/death/zombie-three-death-2.png";
import zFourDeath1 from "./assets/zombies/death/zombie-four-death-1.png";
import zFourDeath2 from "./assets/zombies/death/zombie-four-death-2.png";

import bubWalk1 from "./assets/bub/walk/bub-walk-1.png";
import bubWalk2 from "./assets/bub/walk/bub-walk-2.png";
import bubAtkS1 from "./assets/bub/attack/bub-attack-straight-1.png";
import bubAtkS2 from "./assets/bub/attack/bub-attack-straight-2.png";
import bubAtkL1 from "./assets/bub/attack/bub-attack-left-1.png";
import bubAtkL2 from "./assets/bub/attack/bub-attack-left-2.png";
import bubAtkR1 from "./assets/bub/attack/bub-attack-right-1.png";
import bubAtkR2 from "./assets/bub/attack/bub-attack-right-2.png";
import bubDeath1 from "./assets/bub/death/bub-death-1.png";
import bubDeath2 from "./assets/bub/death/bub-death-2.png";

import heroRun1 from "./assets/hero/hero-run-1.png";
import heroRun2 from "./assets/hero/hero-run-2.png";
import heroStand1 from "./assets/hero/hero-shot-stand-1.png";
import heroStand2 from "./assets/hero/hero-shot-stand-2.png";

import heloIdle from "./assets/helicopter/helo-idle.png";
import heloRefuel from "./assets/helicopter/helo-refuel.png";
import heloSpinup from "./assets/helicopter/helo-spinup.png";
import heloTakeoff1 from "./assets/helicopter/helo-takeoff-1.png";
import heloTakeoff2 from "./assets/helicopter/helo-takeoff-2.png";
import heloTakeoff3 from "./assets/helicopter/helo-takeoff-3.png";
import heloTakeoff4 from "./assets/helicopter/helo-takeoff-4.png";
import heloTakeoff5 from "./assets/helicopter/helo-takeoff-5.png";
import heloTakeoff6 from "./assets/helicopter/helo-takeoff-6.png";

import grenadeImg from "./assets/grenade/grenade.png";
import grenadeEx1 from "./assets/grenade/grenade-explode-1.png";
import grenadeEx2 from "./assets/grenade/grenade-explode-2.png";
import grenadeEx3 from "./assets/grenade/grenade-explode-3.png";
import grenadeEx4 from "./assets/grenade/grenade-explode-4.png";

import ambDrive1 from "./assets/ambulance/driving/ambulance-driving-1.png";
import ambDrive2 from "./assets/ambulance/driving/ambulance-driving-2.png";
import ambEx1 from "./assets/ambulance/explosion/ambulance-explosion-1.png";
import ambEx2 from "./assets/ambulance/explosion/ambulance-explosion-2.png";
import ambEx3 from "./assets/ambulance/explosion/ambulance-explosion-3.png";
import ambEx4 from "./assets/ambulance/explosion/ambulance-explosion-4.png";

type Img = HTMLImageElement;

export type LoadedAssets = {
  zombieWalk: Img[][]; // [type 0..3][frame 0..1]
  zombieDeath: Img[][];
  bubWalk: Img[];
  bubAttack: { straight: Img[]; left: Img[]; right: Img[] };
  bubDeath: Img[];
  heroRun: Img[];
  heroStand: Img[];
  helo: { idle: Img; refuel: Img; spinup: Img; takeoff: Img[] };
  grenade: Img;
  grenadeExplode: Img[];
  ambulanceDrive: Img[];
  ambulanceExplode: Img[];
};

function load(src: string): Promise<Img> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // resolve anyway so one bad asset can't hang the game
    img.src = src;
  });
}

/** Preload every sprite. Resolves once all images are decoded. */
export async function loadAssets(): Promise<LoadedAssets> {
  const src = (d: { src: string }) => d.src;
  const all = [
    zOneWalk1, zOneWalk2, zTwoWalk1, zTwoWalk2, zThreeWalk1, zThreeWalk2, zFourWalk1, zFourWalk2,
    zOneDeath1, zOneDeath2, zTwoDeath1, zTwoDeath2, zThreeDeath1, zThreeDeath2, zFourDeath1, zFourDeath2,
    bubWalk1, bubWalk2, bubAtkS1, bubAtkS2, bubAtkL1, bubAtkL2, bubAtkR1, bubAtkR2, bubDeath1, bubDeath2,
    heroRun1, heroRun2, heroStand1, heroStand2,
    heloIdle, heloRefuel, heloSpinup, heloTakeoff1, heloTakeoff2, heloTakeoff3, heloTakeoff4, heloTakeoff5, heloTakeoff6,
    grenadeImg, grenadeEx1, grenadeEx2, grenadeEx3, grenadeEx4,
    ambDrive1, ambDrive2, ambEx1, ambEx2, ambEx3, ambEx4,
  ];
  const loaded = await Promise.all(all.map((d) => load(src(d))));
  let i = 0;
  const next = () => loaded[i++]!;

  const zombieWalk = [
    [next(), next()], [next(), next()], [next(), next()], [next(), next()],
  ];
  const zombieDeath = [
    [next(), next()], [next(), next()], [next(), next()], [next(), next()],
  ];
  const bubWalk = [next(), next()];
  const bubAttack = {
    straight: [next(), next()],
    left: [next(), next()],
    right: [next(), next()],
  };
  const bubDeath = [next(), next()];
  const heroRun = [next(), next()];
  const heroStand = [next(), next()];
  const helo = {
    idle: next(),
    refuel: next(),
    spinup: next(),
    takeoff: [next(), next(), next(), next(), next(), next()],
  };
  const grenade = next();
  const grenadeExplode = [next(), next(), next(), next()];
  const ambulanceDrive = [next(), next()];
  const ambulanceExplode = [next(), next(), next(), next()];

  return {
    zombieWalk, zombieDeath, bubWalk, bubAttack, bubDeath,
    heroRun, heroStand, helo, grenade, grenadeExplode, ambulanceDrive, ambulanceExplode,
  };
}
