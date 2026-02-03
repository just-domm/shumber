import React, { useEffect, useRef, useState } from 'react';
import { NAKURU_LOCATIONS } from '@/constants';
import { analyzeProduceQuality, fetchMessages } from '@/services/api';
import { parseOfflineMessage } from '@/services/geminiService';
import { User, CropInventory, CropInventoryCreate, AnalysisResult } from '@/app/types/types';

interface FarmerDashboardProps {
  user: User;
  onCreateInventory: (item: CropInventoryCreate) => Promise<CropInventory | null>;
  inventory: CropInventory[];
  onOpenChat: (item: CropInventory) => void;
  authToken: string;
}

type DashboardAnalysis = AnalysisResult & { farmerName?: string };

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  onCreateInventory,
  inventory,
  onOpenChat,
  authToken
}) => {
  const [activeTab, setActiveTab] = useState<'PHOTO' | 'VOICE'>('PHOTO');
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DashboardAnalysis | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [locationName, setLocationName] = useState(NAKURU_LOCATIONS[0].name);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [listingType, setListingType] = useState<'BIDDING' | 'FIXED'>('BIDDING');
  const [unreadById, setUnreadById] = useState<Record<string, number>>({});

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [voiceInputType, setVoiceInputType] = useState<'TEXT' | 'AUDIO'>('TEXT');
  const [voiceText, setVoiceText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toast = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('shumber-toast', { detail: { message, tone } }));
  };

  useEffect(() => {
    if (!authToken) return;
    let timer: number | null = null;
    const poll = async () => {
      const owned = inventory.filter((item) => item.farmerId === user.id);
      if (owned.length === 0) {
        setUnreadById({});
        return;
      }
      try {
        const updates: Record<string, number> = {};
        await Promise.all(
          owned.map(async (item) => {
            const messages = await fetchMessages(item.id, authToken);
            const lastSeen = localStorage.getItem(`shumber_last_seen_${item.id}`);
            const unread = messages.filter(
              (msg) =>
                msg.senderId !== user.id &&
                (!lastSeen || new Date(msg.timestamp).getTime() > new Date(lastSeen).getTime())
            ).length;
            updates[item.id] = unread;
          })
        );
        setUnreadById(updates);
      } catch (error) {
        console.error('Failed to load unread counts', error);
      }
    };

    poll();
    timer = window.setInterval(poll, 4000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [authToken, inventory, user.id]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast('Could not access camera. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
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
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast('Could not access microphone. Please check permissions.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProcessVoice = async (audioData?: string) => {
    if (!audioData && !voiceText.trim()) {
      toast('Please enter an SMS message to parse.', 'error');
      return;
    }

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
        estimatedShelfLife: 'N/A',
        marketInsight: 'Reported via AI Voice/SMS Hub',
        farmerName: result.farmerName || user.name
      });
      setQuantity(result.quantity ? result.quantity.toString() : '');
      setLocationName(result.locationName || NAKURU_LOCATIONS[0].name);
    } catch (error) {
      console.error('AI parsing failed', error);
      toast('AI was unable to parse. Please try again or speak clearer.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!analysis || !quantity) return;
    const location = NAKURU_LOCATIONS.find((l) => l.name === locationName) || NAKURU_LOCATIONS[0];
    const basePrice = Math.round(analysis.freshnessScore * 0.6);

    const newItem: CropInventoryCreate = {
      cropName: analysis.cropName,
      quantity: parseInt(quantity, 10),
      qualityScore: analysis.freshnessScore,
      basePrice,
      currentBid: basePrice,
      location,
      imageUrl: preview || undefined,
      listingType
    };

    const created = await onCreateInventory(newItem);
    if (created) {
      setPreview(null);
      setAnalysis(null);
      setQuantity('');
      setListingType('BIDDING');
      setAudioBase64(null);
      setVoiceText('');
    }
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
            <button
              onClick={() => setActiveTab('PHOTO')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                activeTab === 'PHOTO' ? 'bg-black text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              Smart Scan
            </button>
            <button
              onClick={() => setActiveTab('VOICE')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                activeTab === 'VOICE' ? 'bg-black text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              SMS / Voice
            </button>
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
                    <button onClick={startCamera} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">
                      Open Camera
                    </button>
                  </div>
                )}
                {isCameraActive && (
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-black/10 shadow-xl"
                  ></button>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-[32px] border-2 border-dashed border-gray-200 min-h-[300px] flex flex-col justify-center">
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setVoiceInputType('TEXT')}
                    className={`text-[10px] font-black uppercase ${
                      voiceInputType === 'TEXT' ? 'text-black underline decoration-2' : 'text-gray-400'
                    }`}
                  >
                    SMS Mode
                  </button>
                  <button
                    onClick={() => setVoiceInputType('AUDIO')}
                    className={`text-[10px] font-black uppercase ${
                      voiceInputType === 'AUDIO' ? 'text-black underline decoration-2' : 'text-gray-400'
                    }`}
                  >
                    Voice Note
                  </button>
                </div>

                {voiceInputType === 'TEXT' ? (
                  <textarea
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    placeholder="Describe your harvest here..."
                    className="w-full bg-transparent border-none text-xl font-bold placeholder:text-gray-300 focus:ring-0 min-h-[120px]"
                  />
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        isRecording ? 'bg-red-500 scale-110' : 'bg-black'
                      }`}
                    >
                      {isRecording ? (
                        <button onClick={stopRecording} className="w-8 h-8 bg-white rounded-sm animate-pulse"></button>
                      ) : (
                        <button onClick={startRecording} className="text-white">
                          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="mt-4 font-black uppercase text-[10px] tracking-widest text-gray-400">
                      {isRecording ? 'Listening... Speak in any language' : 'Tap to record voice report'}
                    </p>
                  </div>
                )}

                {voiceInputType === 'TEXT' && (
                  <button
                    onClick={() => handleProcessVoice()}
                    disabled={analyzing}
                    className="bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] mt-4 disabled:opacity-50"
                  >
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
                  <p className="text-sm text-gray-400 mt-2 italic">&quot;{analysis.marketInsight}&quot;</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">KG</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-gray-100 p-4 rounded-2xl font-bold border-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Hub</label>
                    <select
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full bg-gray-100 p-4 rounded-2xl font-bold border-none"
                    >
                      {NAKURU_LOCATIONS.map((l) => (
                        <option key={l.name} value={l.name}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Selling Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setListingType('BIDDING')}
                        className={`rounded-2xl p-4 text-left border ${
                          listingType === 'BIDDING'
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-gray-100 text-black'
                        }`}
                      >
                        <p className="text-xs font-black uppercase tracking-widest">Open Bidding</p>
                        <p className="text-[11px] mt-2 opacity-70">Buyers compete for the best price.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingType('FIXED')}
                        className={`rounded-2xl p-4 text-left border ${
                          listingType === 'FIXED'
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-gray-100 text-black'
                        }`}
                      >
                        <p className="text-xs font-black uppercase tracking-widest">Fixed Price</p>
                        <p className="text-[11px] mt-2 opacity-70">Sell instantly at your set price.</p>
                      </button>
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
            ) : preview && !analyzing ? (
              <button
                onClick={() => analyzeProduceQuality(preview).then(setAnalysis)}
                className="bg-green-600 text-white p-10 rounded-[32px] font-black text-xl hover:scale-105 transition-all"
              >
                Verify Quality with Gemini AI
              </button>
            ) : (
              <div className="text-center opacity-30">
                <p className="font-bold text-sm uppercase leading-relaxed">
                  Gemini AI Bridge is ready.
                  <br />
                  Upload a photo or speak to add data to the heatmap.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] uber-shadow border border-gray-100 mt-8">
        <header className="mb-6">
          <h3 className="text-2xl font-black tracking-tighter text-black">Inbox</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Open chats for your active listings
          </p>
        </header>
        <div className="space-y-4">
          {(() => {
            const items = inventory.filter((item) => item.farmerId === user.id);
            if (items.length === 0) {
              return <p className="text-sm text-gray-400">No active listings yet.</p>;
            }
            return items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-3xl border border-gray-100 p-4">
                <div>
                  <p className="text-sm font-black">{item.cropName}</p>
                  <p className="text-[11px] text-gray-500 font-semibold">{item.location.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenChat(item)}
                    className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full"
                  >
                    Open Chat
                  </button>
                  {unreadById[item.id] ? (
                    <span className="bg-green-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                      {unreadById[item.id]}
                    </span>
                  ) : null}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FarmerDashboard;
