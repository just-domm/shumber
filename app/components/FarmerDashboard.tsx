
import React, { useState, useRef } from 'react';
// Fix: Import User and CropInventory from types.ts where they are defined and exported
import { NAKURU_LOCATIONS } from '@/constants';
import { analyzeProduceQuality, parseOfflineMessage } from '@/services/geminiService';
import { User, CropInventory } from '@/types';

interface FarmerDashboardProps {
  user: User;
  onAddInventory: (item: CropInventory) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ user, onAddInventory }) => {
  const [activeTab, setActiveTab] = useState<'PHOTO' | 'VOICE'>('PHOTO');
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [locationName, setLocationName] = useState(NAKURU_LOCATIONS[0].name);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [voiceInputType, setVoiceInputType] = useState<'TEXT' | 'AUDIO'>('TEXT');
  const [voiceText, setVoiceText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) { alert("Camera access denied."); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg'));
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        setIsCameraActive(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioBase64(base64);
          handleProcessVoice(base64);
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProcessVoice = async (audioData?: string) => {
    setAnalyzing(true);
    try {
      let result;
      if (audioData) {
        result = await parseOfflineMessage({ data: audioData.split(',')[1], mimeType: 'audio/webm' });
      } else {
        result = await parseOfflineMessage(voiceText);
      }
      
      setAnalysis({
        cropName: result.cropName,
        freshnessScore: 85,
        marketInsight: "Reported via AI Voice/SMS Hub",
        farmerName: result.farmerName
      });
      setQuantity(result.quantity.toString());
      setLocationName(result.locationName);
    } catch (e) {
      alert("AI was unable to parse. Please try again or speak clearer.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!analysis || !quantity) return;
    const loc = NAKURU_LOCATIONS.find(l => l.name === locationName) || NAKURU_LOCATIONS[0];
    onAddInventory({
      id: Math.random().toString(36).substr(2, 9),
      farmerId: user.id,
      farmerName: analysis.farmerName || user.name,
      cropName: analysis.cropName,
      quantity: parseInt(quantity),
      qualityScore: analysis.freshnessScore || 80,
      basePrice: 40,
      currentBid: 40,
      location: loc,
      imageUrl: preview || undefined,
      timestamp: new Date().toISOString(),
      status: 'AVAILABLE',
      source: activeTab === 'VOICE' ? (audioBase64 ? 'VOICE' : 'SMS') : 'APP'
    });
    setAnalysis(null);
    setPreview(null);
    setAudioBase64(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-[40px] uber-shadow border border-gray-100">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-black">List Harvest</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inclusion Mode Active</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setActiveTab('PHOTO')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'PHOTO' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>Smart Scan</button>
            <button onClick={() => setActiveTab('VOICE')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'VOICE' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>SMS / Voice</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            {activeTab === 'PHOTO' ? (
              <div className="relative rounded-[32px] overflow-hidden bg-gray-100 aspect-square shadow-inner">
                {isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : preview ? (
                  <img src={preview} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <button onClick={startCamera} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">Open Camera</button>
                  </div>
                )}
                {isCameraActive && <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-black/10 shadow-xl"></button>}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-[32px] border-2 border-dashed border-gray-200 min-h-[300px] flex flex-col justify-center">
                <div className="flex space-x-4 mb-6">
                  <button onClick={() => setVoiceInputType('TEXT')} className={`text-[10px] font-black uppercase ${voiceInputType === 'TEXT' ? 'text-black underline decoration-2' : 'text-gray-400'}`}>SMS Mode</button>
                  <button onClick={() => setVoiceInputType('AUDIO')} className={`text-[10px] font-black uppercase ${voiceInputType === 'AUDIO' ? 'text-black underline decoration-2' : 'text-gray-400'}`}>Voice Note</button>
                </div>
                
                {voiceInputType === 'TEXT' ? (
                  <textarea 
                    value={voiceText}
                    onChange={e => setVoiceText(e.target.value)}
                    placeholder="Describe your harvest here..."
                    className="w-full bg-transparent border-none text-xl font-bold placeholder:text-gray-300 focus:ring-0 min-h-[120px]"
                  />
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-black'}`}>
                      {isRecording ? (
                        <button onClick={stopRecording} className="w-8 h-8 bg-white rounded-sm animate-pulse"></button>
                      ) : (
                        <button onClick={startRecording} className="text-white">
                          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                        </button>
                      )}
                    </div>
                    <p className="mt-4 font-black uppercase text-[10px] tracking-widest text-gray-400">
                      {isRecording ? "Listening... Speak in any language" : "Tap to record voice report"}
                    </p>
                  </div>
                )}
                
                {voiceInputType === 'TEXT' && (
                  <button onClick={() => handleProcessVoice()} disabled={analyzing} className="bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] mt-4">
                    {analyzing ? 'AI Parsing...' : 'Process SMS'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            {analysis ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-8 bg-black text-white rounded-[32px]">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">AI Data Extraction</p>
                  <h3 className="text-3xl font-black">{analysis.cropName}</h3>
                  <p className="text-sm text-gray-400 mt-2 italic">"{analysis.marketInsight}"</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">KG</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-100 p-4 rounded-2xl font-bold border-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Hub</label>
                    <select value={locationName} onChange={e => setLocationName(e.target.value)} className="w-full bg-gray-100 p-4 rounded-2xl font-bold border-none">
                      {NAKURU_LOCATIONS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl">Confirm Listing</button>
              </div>
            ) : preview && !analyzing ? (
              <button onClick={() => analyzeProduceQuality(preview).then(setAnalysis)} className="bg-green-600 text-white p-10 rounded-[32px] font-black text-xl hover:scale-105 transition-all">Verify Quality with Gemini AI</button>
            ) : (
              <div className="text-center opacity-30">
                <p className="font-bold text-sm uppercase leading-relaxed">Gemini AI Bridge is ready.<br/>Upload a photo or speak to add data to the heatmap.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FarmerDashboard;