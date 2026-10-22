const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const voiceDir = path.join(__dirname, 'assets', 'voice');
fs.mkdirSync(voiceDir, { recursive: true });

const lines = [
  { id: 'vo1', text: 'UAE business owners! Is your business still without a professional website?', rate: '+35%', pitch: '-2Hz' },
  { id: 'vo2', text: 'Customers search online. Make it easy for them to find and trust your business.', rate: '+25%', pitch: '-2Hz' },
  { id: 'vo3', text: 'Ujjwal creates modern, mobile-friendly websites designed around your business.', rate: '+18%', pitch: '-2Hz' },
  { id: 'vo4', text: 'And you can get started with a professional website for just three hundred and twenty-nine dirhams.', rate: '+18%', pitch: '-2Hz' },
  { id: 'vo5', text: 'Want a website for your business? Message Ujjwal today.', rate: '+25%', pitch: '-2Hz' },
  { id: 'vo6', text: 'Ujjwal. Your business deserves a better online presence.', rate: '+25%', pitch: '-2Hz' }
];

async function generate() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-ChristopherNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  for (const item of lines) {
    const outPath = path.join(voiceDir, `${item.id}.mp3`);
    const { audioStream } = tts._rawSSMLRequest(tts._SSMLTemplate(item.text, { rate: item.rate, pitch: item.pitch }));
    const write = fs.createWriteStream(outPath);
    await new Promise((res, rej) => {
      audioStream.pipe(write);
      write.on('finish', res);
      write.on('error', rej);
    });
    const dur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outPath}"`).toString().trim();
    console.log(`${item.id}: ${dur}s | ${item.text}`);
  }
  tts.close();
}

generate().catch(console.error);
