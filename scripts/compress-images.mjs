import sharp from 'sharp';
import { statSync, writeFileSync } from 'fs';

const sizes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function compress() {
  const tasks = [
    { input: 'public/images/doctor-hero.webp', output: 'public/images/doctor-hero.webp', resize: { width: 900 }, quality: 75, label: 'doctor-hero.webp' },
    { input: 'public/images/doctor-hero-light.webp', output: 'public/images/doctor-hero-light.webp', resize: { width: 900 }, quality: 75, label: 'doctor-hero-light.webp' },
    { input: 'public/favicon-healthassist-20260521.webp', output: 'public/favicon-healthassist-20260521.webp', resize: { width: 192, height: 192 }, quality: 80, label: 'favicon.webp' },
    { input: 'public/icon-192.webp', output: 'public/icon-192.webp', resize: { width: 192, height: 192 }, quality: 80, label: 'icon-192.webp' },
    { input: 'public/images/robot-aimar.webp', output: 'public/images/robot-aimar.webp', resize: { width: 600 }, quality: 75, label: 'robot-aimar.webp' },
    { input: 'public/images/scan-phone.webp', output: 'public/images/scan-phone.webp', resize: { width: 600 }, quality: 75, label: 'scan-phone.webp' },
    { input: 'public/images/doctor-bg.webp', output: 'public/images/doctor-bg.webp', resize: { width: 900 }, quality: 70, label: 'doctor-bg.webp' },
    { input: 'public/images/robot-404.webp', output: 'public/images/robot-404.webp', resize: { width: 600 }, quality: 75, label: 'robot-404.webp' },
  ];

  let totalBefore = 0, totalAfter = 0;
  for (const task of tasks) {
    try {
      const before = statSync(task.input).size;
      const buffer = await sharp(task.input)
        .resize(task.resize)
        .webp({ quality: task.quality, effort: 6 })
        .toBuffer();
      writeFileSync(task.output, buffer);
      const after = buffer.length;
      totalBefore += before; totalAfter += after;
      const saving = ((1 - after / before) * 100).toFixed(0);
      console.log(`✅ ${task.label}: ${sizes(before)} → ${sizes(after)} (-${saving}%)`);
    } catch (e) {
      console.log(`⚠️  ${task.label}: ${e.message}`);
    }
  }
  console.log(`\n📦 Total: ${sizes(totalBefore)} → ${sizes(totalAfter)} (-${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`);
}

compress();
