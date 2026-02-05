import React, { useEffect, useRef, useState } from 'react';
import { NAKURU_LOCATIONS } from '@/constants';
import { analyzeProduceQuality, fetchMessages, parseOfflineMessage } from '@/services/api';
import { User, CropInventory, AnalysisResult, CropInventoryCreate } from '@/app/types/types';
import HeatMap from '@/app/components/HeatMap';

interface FarmerDashboardProps {
  user: User;
  onCreateInventory: (item: CropInventoryCreate) => Promise<CropInventory | null>;
  inventory: CropInventory[];
  onOpenChat: (item: CropInventory) => void;
  onLockPrice: (item: CropInventory) => Promise<void>;
  authToken: string;
}

type DashboardAnalysis = AnalysisResult & { farmerName?: string };

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  onCreateInventory,
  inventory,
  onOpenChat,
  onLockPrice,
  authToken
}) => {
  const [activeTab, setActiveTab] = useState<'PHOTO' | 'VOICE'>('PHOTO');
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DashboardAnalysis | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [basePriceInput, setBasePriceInput] = useState<string>('');
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [locationName, setLocationName] = useState(NAKURU_LOCATIONS[0].name);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [listingType, setListingType] = useState<'BIDDING' | 'FIXED'>('BIDDING');
  const [unreadById, setUnreadById] = useState<Record<string, number>>({});
  const [messageCountById, setMessageCountById] = useState<Record<string, number>>({});

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [voiceInputType, setVoiceInputType] = useState<'TEXT' | 'AUDIO'>('TEXT');
  const [voiceText, setVoiceText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const counts: Record<string, number> = {};
        await Promise.all(
          owned.map(async (item) => {
            const messages = await fetchMessages(item.id, authToken);
            counts[item.id] = messages.length;
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
        setMessageCountById(counts);
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

  useEffect(() => {
    if (!analysis) {
      setSuggestedPrice(null);
      setBasePriceInput('');
      return;
    }
    const suggestion = Math.max(1, Math.round(analysis.freshnessScore * 0.6));
    setSuggestedPrice(suggestion);
    setBasePriceInput(`${suggestion}`);
  }, [analysis]);

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

  const handleSelectUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
    };
    reader.onerror = () => {
      toast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
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
        result = await parseOfflineMessage({ audioBase64: audioData });
      } else {
        result = await parseOfflineMessage({ text: voiceText });
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
    const parsedPrice = parseInt(basePriceInput, 10);
    if (!parsedPrice || parsedPrice <= 0) {
      toast('Please set a valid price per Kg.', 'error');
      return;
    }
    const basePrice = parsedPrice;

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
      setBasePriceInput('');
      setSuggestedPrice(null);
      setListingType('BIDDING');
      setAudioBase64(null);
      setVoiceText('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 animate-fadeIn">
      <div className="bg-white p-6 sm:p-7 md:p-8 rounded-[32px] md:rounded-[40px] uber-shadow border border-gray-100">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-black">List Harvest</h2>
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

        <div className="grid lg:grid-cols-2 gap-6 md:gap-10">
          <div className="space-y-6">
            {activeTab === 'PHOTO' ? (
              <div className="relative rounded-[28px] md:rounded-[32px] overflow-hidden bg-gray-100 aspect-square shadow-inner">
                {isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : preview ? (
                  <img src={preview} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <button onClick={startCamera} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">
                        Open Camera
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">or</span>
                      <button onClick={handleSelectUpload} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs border border-gray-200">
                        Upload Photo
                      </button>
                    </div>
                  </div>
                )}
                {isCameraActive && (
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-black/10 shadow-xl"
                  ></button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </div>
            ) : (
              <div className="bg-gray-50 p-6 sm:p-7 md:p-8 rounded-[28px] md:rounded-[32px] border-2 border-dashed border-gray-200 min-h-[240px] md:min-h-[300px] flex flex-col justify-center">
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
                    className="w-full bg-transparent border-none text-lg sm:text-xl font-bold placeholder:text-gray-300 focus:ring-0 min-h-[110px]"
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
                <div className="p-6 sm:p-7 md:p-8 bg-black text-white rounded-[28px] md:rounded-[32px]">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">AI Data Extraction</p>
                  <h3 className="text-2xl sm:text-3xl font-black">{analysis.cropName}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      Freshness {Math.round(analysis.freshnessScore)}%
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      Shelf Life {analysis.estimatedShelfLife}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-3 italic">&quot;{analysis.marketInsight}&quot;</p>
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
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Your Price (KES per Kg)</label>
                  <input
                    type="number"
                    value={basePriceInput}
                    onChange={(e) => setBasePriceInput(e.target.value)}
                    className="w-full bg-gray-100 p-4 rounded-2xl font-bold border-none"
                  />
                  {suggestedPrice ? (
                    <p className="text-[10px] text-gray-400 font-semibold">
                      Suggested starting price: KES {suggestedPrice}
                    </p>
                  ) : null}
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

      <div className="bg-white p-6 sm:p-7 md:p-8 rounded-[32px] md:rounded-[40px] uber-shadow border border-gray-100 mt-6 md:mt-8">
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
            return items.map((item) => {
              const messageCount = messageCountById[item.id] || 0;
              const hasMessages = messageCount > 0;
              return (
              <div key={item.id} className="flex flex-col gap-3 rounded-3xl border border-gray-100 p-4">
                <div>
                  <p className="text-sm font-black">{item.cropName}</p>
                  <p className="text-[11px] text-gray-500 font-semibold">{item.location.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => onOpenChat(item)}
                      disabled={!hasMessages}
                      className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full disabled:opacity-40"
                    >
                      {hasMessages ? 'Open Chat' : 'No Requests Yet'}
                    </button>
                    {unreadById[item.id] ? (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center">
                        {unreadById[item.id]}
                      </span>
                    ) : null}
                  </div>
                  {item.listingType === 'BIDDING' && (
                    <button
                      onClick={() => onLockPrice(item)}
                      className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-gray-200"
                    >
                      Lock Price (KES {item.currentBid})
                    </button>
                  )}
                  {messageCountById[item.id] ? (
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {messageCountById[item.id]} msgs
                    </span>
                  ) : null}
                </div>
              </div>
            );
            });
          })()}
        </div>
      </div>

      <div className="bg-white p-6 sm:p-7 md:p-8 rounded-[32px] md:rounded-[40px] uber-shadow border border-gray-100 mt-6 md:mt-8">
        <header className="mb-6">
          <h3 className="text-2xl font-black tracking-tighter text-black">Completed Sales</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Recently released escrows.
          </p>
        </header>
        <div className="space-y-3">
          {(() => {
            const sold = inventory.filter((item) => item.farmerId === user.id && item.status === 'SOLD');
            if (sold.length === 0) {
              return <p className="text-sm text-gray-400">No completed sales yet.</p>;
            }
            return sold.slice(0, 4).map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-sm font-black">{item.cropName}</p>
                <p className="text-[11px] text-gray-500 font-semibold">{item.location.name}</p>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  KES {item.currentBid} • {item.quantity} Kg
                </p>
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="bg-white p-6 sm:p-7 md:p-8 rounded-[32px] md:rounded-[40px] uber-shadow border border-gray-100 mt-6 md:mt-8">
        <header className="mb-6">
          <h3 className="text-2xl font-black tracking-tighter text-black">Market Heatmap</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Read-only view for active listings.
          </p>
        </header>
        <div className="relative h-[320px] rounded-3xl overflow-hidden border border-gray-100">
          <HeatMap
            inventory={inventory}
            onSelectCrop={() => {}}
            onRegionSelect={() => {}}
            defaultCenter={[NAKURU_LOCATIONS[8].lat, NAKURU_LOCATIONS[8].lng]}
            defaultZoom={11}
          />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FarmerDashboard;
