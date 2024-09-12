import Fonts from "../lib/Fonts.js";
import Images from "../lib/Images.js";
import Sounds from "../lib/Sounds.js";
import StateMachine from "../lib/StateMachine.js";
import Timer from "../lib/Timer.js";

export const canvas = document.createElement('canvas');
export const context = canvas.getContext('2d') || new CanvasRenderingContext2D();
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 352;

export const keys = {};
export const sounds = new Sounds();
export const images = new Images(context);
export const fonts = new Fonts();
export const timer = new Timer();
export const stateMachine = new StateMachine();
