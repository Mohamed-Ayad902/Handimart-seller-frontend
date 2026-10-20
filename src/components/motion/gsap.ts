"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** The app's motion tokens (Core HandiMotion): 120/240/420/600 ms, soft ease-out, settle with no bounce. */
export const EASE = "power3.out";
export const DUR = { quick: 0.12, standard: 0.24, emphasized: 0.42, long: 0.6 } as const;
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
