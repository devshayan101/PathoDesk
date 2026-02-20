import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

async function buildIcons() {
    const svgPath = path.resolve('public/icon.svg');
    const pngPath = path.resolve('public/icon.png');

    try {
        const canvas = createCanvas(1024, 1024);
        const ctx = canvas.getContext('2d');

        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#2563eb');

        // Draw rounded rect
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(0, 0, 1024, 1024, 224);
        ctx.fill();

        // Draw inner shapes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(512, 512, 272, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 96;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(512, 320);
        ctx.lineTo(512, 704);
        ctx.moveTo(320, 512);
        ctx.lineTo(704, 512);
        ctx.stroke();

        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 24;
        ctx.beginPath();
        ctx.arc(512, 512, 64, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(pngPath, buffer);

        console.log('Successfully generated public/icon.png');
    } catch (error) {
        console.error('Error generating PNG:', error);
    }
}

buildIcons();
