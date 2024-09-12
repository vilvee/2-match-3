import Images from "../lib/Images.js";
import StateMachine from "../lib/StateMachine.js";

export const canvas = document.createElement('canvas');
export const context = canvas.getContext('2d') || new CanvasRenderingContext2D();
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 360;

export const images = new Images(context);
export const stateMachine = new StateMachine();
