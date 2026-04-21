import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);

CustomEase.create("cinematic", "0.25, 0.1, 0.0, 1.0");

export { gsap, ScrollTrigger, CustomEase };
