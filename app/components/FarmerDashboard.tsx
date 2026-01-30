
import React, { useState, useRef } from 'react';
// Fix: Import User and CropInventory from types.ts where they are defined and exported
import { NAKURU_LOCATIONS } from '@/constants';
import { analyzeProduceQuality } from '@/services/geminiService';
import { User, CropInventory, AnalysisResult } from '@/types';

interface FarmerDashboardProps {
  user: User;
  onAddInventory: (item: CropInventory) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ user, onAddInventory }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [locationName, setLocationName] = useState(NAKURU_LOCATIONS[0].name);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPreview(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setAnalyzing(true);
    try {
      const result = await analyzeProduceQuality(preview);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI Analysis failed. Please try again with a clearer photo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!analysis || !quantity) return;
    const location = NAKURU_LOCATIONS.find(l => l.name === locationName) || NAKURU_LOCATIONS[0];
    const basePrice = Math.round(analysis.freshnessScore * 0.6); // Dynamic pricing mock

    const newItem: CropInventory = {
      id: Math.random().toString(36).substr(2, 9),
      farmerId: user.id,
      farmerName: user.name,
      cropName: analysis.cropName,
      quantity: parseInt(quantity),
      qualityScore: analysis.freshnessScore,
      basePrice: basePrice,
      currentBid: basePrice,
      location: location,
      imageUrl: preview || undefined,
      timestamp: new Date().toISOString(),
      status: 'AVAILABLE'
    };

    onAddInventory(newItem);
    setPreview(null);
    setAnalysis(null);
    setQuantity('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-[40px] uber-shadow border border-gray-100">
        <header className="mb-8">
          <h2 className="text-4xl font-black tracking-tighter text-black">New Harvest</h2>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">List your surplus for Nakuru buyers</p>
        </header>
        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Capture Section */}
          <div className="space-y-6">
            <div className="relative rounded-[32px] overflow-hidden bg-gray-100 aspect-square border-4 border-gray-50 shadow-inner group">
              {isCameraActive ? (
                <div className="absolute inset-0">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none"></div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
                    <button 
                      onClick={capturePhoto}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-black/10 active:scale-90 transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-black"></div>
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="bg-black/60 backdrop-blur-md text-white p-4 rounded-full"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ) : preview ? (
                <div className="relative w-full h-full">
                  <img src={preview} alt="Produce" className="w-full h-full object-cover" />
                  {analyzing && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                      <div className="w-full h-1 bg-green-500 shadow-[0_0_20px_#22c55e] absolute top-0 animate-[bounce_2s_infinite]"></div>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
                      <p className="font-black uppercase tracking-widest text-xs">Gemini AI Grading...</p>
                    </div>
                  )}
                  {!analysis && !analyzing && (
                    <button 
                      onClick={() => setPreview(null)}
                      className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                   <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </div>
                   <div className="flex flex-col space-y-2 w-full px-8">
                     <button 
                       onClick={startCamera}
                       className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform"
                     >
                       Take Live Photo
                     </button>
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="w-full bg-gray-200 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                     >
                       Upload from Gallery
                     </button>
                   </div>
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
            <canvas ref={canvasRef} className="hidden" />

            {preview && !analysis && !analyzing && (
              <button 
                onClick={handleAnalyze}
                className="w-full bg-green-600 text-white font-black py-5 rounded-[24px] uppercase tracking-[0.2em] text-xs shadow-xl shadow-green-100"
              >
                Verify with Gemini AI
              </button>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col justify-center">
            {analysis ? (
              <div className="space-y-8 animate-fadeIn">
                <div className="p-8 bg-green-50 rounded-[32px] border border-green-100">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-4">Gemini Analysis Result</p>
                  <h3 className="text-3xl font-black text-black mb-1">{analysis.cropName}</h3>
                  <div className="flex items-center space-x-3 mb-6">
                    <span className="text-4xl font-black text-green-700">{analysis.freshnessScore}%</span>
                    <span className="text-[11px] font-bold text-green-600 leading-tight uppercase tracking-widest">Quality<br/>Score</span>
                  </div>
                  <div className="space-y-2 text-sm text-green-800 font-medium">
                    <p>• <b>Shelf Life:</b> {analysis.estimatedShelfLife}</p>
                    <p className="italic font-normal">"{analysis.marketInsight}"</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Weight (KG)</label>
                      <input 
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="500"
                        className="w-full bg-gray-100 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Hub Location</label>
                      <select 
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="w-full bg-gray-100 border-none rounded-2xl p-4 font-bold appearance-none cursor-pointer"
                      >
                        {NAKURU_LOCATIONS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmit}
                    disabled={!quantity}
                    className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs disabled:opacity-20 transition-all"
                  >
                    Post to Shumber Hub
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-30 px-12">
                <div className="w-16 h-1 bg-gray-200 mx-auto rounded-full"></div>
                <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">
                  Upload a photo of your produce to unlock AI quality grading and instant market listing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;