/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Share2, Type, RefreshCw, ClipboardPaste, Activity, FilePlus, History, X } from 'lucide-react';

interface HistoryItem {
  id: string;
  text: string;
  audioUrl: string;
  timestamp: Date;
  voice: string;
}

export default function App() {
  const [text, setText] = useState('Kéo mỗi cây về đúng nhóm.');
  const [audioProfile, setAudioProfile] = useState('Nữ người Việt, khoảng 25 tuổi, sinh ra và lớn lên tại Hà Nội. Giọng Bắc chuẩn, trong trẻo, ấm áp, thân thiện, giống một cô giáo tiểu học trẻ.');
  const [directorNotes, setDirectorNotes] = useState('[clear and friendly]\nĐọc với giọng hướng dẫn rõ ràng, thân thiện và dứt khoát. Nhịp vừa phải, mở đầu thu hút sự chú ý nhưng không lên giọng quá cao. Nhấn nhẹ vào động từ hành động như "kéo", "chọn", "lật", "ghép" và vào từ khóa quan trọng. Kết câu mềm và khuyến khích, như cô giáo đang mời học sinh bắt đầu trò chơi, không phải đang ra lệnh nghiêm khắc.');
  const [voice, setVoice] = useState('BM');
  const [format, setFormat] = useState('MP3');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [enablePauseDetection, setEnablePauseDetection] = useState(true);

  // Mock settings
  const [speed, setSpeed] = useState('1.0x');
  const [pitch, setPitch] = useState('0%');

  const voices = [
    { id: 'BM', name: 'Ban Mai (Nữ)', desc: 'Miền Bắc • Truyền cảm' },
    { id: 'LS', name: 'Linh Sang (Nữ)', desc: 'Miền Nam • Trẻ trung' },
    { id: 'MQ', name: 'Minh Quang (Nam)', desc: 'Miền Bắc • Đĩnh đạc' }
  ];

  const formats = ['MP3', 'WAV', 'OGG', 'FLAC'];

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleGenerateAndPlay = async () => {
    if (!text.trim()) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl && !isLoading) {
      audioRef.current?.play().catch(console.error);
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice,
          speed,
          pitch,
          audioProfile,
          directorNotes,
          enablePauseDetection
        }),
      });

      const data = await response.json();
      if (response.ok && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        const newAudio = new Audio(data.audioUrl);
        audioRef.current = newAudio;
        newAudio.onended = () => setIsPlaying(false);
        newAudio.play().catch(console.error);
        setIsPlaying(true);

        const newItem: HistoryItem = {
          id: Date.now().toString(),
          text,
          audioUrl: data.audioUrl,
          timestamp: new Date(),
          voice
        };
        setHistory(prev => [newItem, ...prev]);
      } else {
        let errorMsg = data.error || 'Failed to generate audio';
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          errorMsg = 'Hệ thống đã đạt giới hạn sử dụng API (Quota exceeded). Vui lòng thử lại sau ít phút hoặc sử dụng tài khoản có gói cước cao hơn.';
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error(error);
      alert('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewText = () => {
    if (text.trim() || audioUrl) {
      const confirmNext = window.confirm("Bạn có chắc chắn muốn chuyển sang văn bản mới không? Đoạn văn bản hiện tại sẽ bị xóa.");
      if (confirmNext) {
        setText('');
        setAudioUrl(null);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const handleDownload = () => {
    if (!audioUrl) {
      alert("Hãy tạo âm thanh trước khi lưu!");
      return;
    }
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `vietvoice-export.${format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  return (
    <div className="bg-slate-50 h-screen w-full flex flex-col font-sans text-slate-900 overflow-hidden border-8 border-slate-100">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-sm">
            <div className="w-4 h-1 bg-white"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">VietVoice AI</h1>
          <span className="ml-4 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest border border-blue-100">
            Pro Edition
          </span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
          <a href="#" className="text-blue-600">Trình điều khiển</a>
          <button onClick={() => setShowHistory(true)} className="hover:text-slate-700">Lịch sử chuyển đổi</button>
          <a href="#" className="hover:text-slate-700">Thư viện mẫu</a>
          <a href="#" className="hover:text-slate-700">Tài liệu API</a>
        </nav>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center">
             <span className="text-xs font-bold text-slate-400">U</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Chọn giọng đọc</h2>
            <div className="space-y-3">
              {voices.map(v => (
                <div
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    voice === v.id
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'border border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold ${
                    voice === v.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {v.id}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{v.name}</div>
                    <div className="text-[11px] text-slate-500 italic">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tùy chỉnh âm thanh</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium">Tốc độ đọc</span>
                  <span className="text-blue-600 font-bold">{speed}</span>
                </div>
                <div className="h-1 bg-slate-100 relative">
                  <div className="absolute h-full w-1/2 bg-blue-500"></div>
                  <div className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1 left-1/2 -ml-1.5 cursor-pointer hover:scale-125 transition-transform"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium">Cao độ (Pitch)</span>
                  <span className="text-blue-600 font-bold">{pitch}</span>
                </div>
                <div className="h-1 bg-slate-100 relative">
                  <div className="absolute h-full w-1/2 bg-blue-500"></div>
                  <div className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1 left-1/2 -ml-1.5 cursor-pointer hover:scale-125 transition-transform"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium">Âm lượng</span>
                  <span className="text-blue-600 font-bold">85%</span>
                </div>
                <div className="h-1 bg-slate-100 relative">
                  <div className="absolute h-full w-[85%] bg-blue-500"></div>
                  <div className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1 left-[85%] -ml-1.5 cursor-pointer hover:scale-125 transition-transform"></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Editor Area */}
        <section className="flex-1 flex flex-col p-8 bg-slate-50 min-w-0 gap-6 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 shrink-0">
            {/* Audio Profile */}
            <div className="bg-white border border-slate-200 shadow-sm flex flex-col">
              <div className="h-10 border-b border-slate-100 px-4 flex items-center bg-slate-50/30">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audio Profile</span>
              </div>
              <textarea
                value={audioProfile}
                onChange={(e) => setAudioProfile(e.target.value)}
                className="p-4 text-sm text-slate-700 resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-blue-50/50 h-28"
                placeholder="Ví dụ: Nữ người Việt, khoảng 25 tuổi, sinh ra và lớn lên tại Hà Nội..."
                spellCheck="false"
              />
            </div>
            
            {/* Director's Notes */}
            <div className="bg-white border border-slate-200 shadow-sm flex flex-col">
              <div className="h-10 border-b border-slate-100 px-4 flex items-center bg-slate-50/30">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Director's Notes</span>
              </div>
              <textarea
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                className="p-4 text-sm text-slate-700 resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-blue-50/50 h-28"
                placeholder="Ví dụ: Đọc với giọng hướng dẫn rõ ràng, thân thiện và dứt khoát..."
                spellCheck="false"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 flex-1 flex flex-col shadow-sm min-h-[300px]">
            <div className="h-12 border-b border-slate-100 px-4 flex items-center justify-between bg-slate-50/30 shrink-0 overflow-x-auto">
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleNewText}
                  className="px-3 py-1 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1 transition-colors text-blue-600 whitespace-nowrap"
                >
                  <FilePlus className="w-3 h-3" /> Đoạn mới
                </button>
                <button
                  onClick={() => setText('')}
                  className="px-3 py-1 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-3 h-3" /> Làm mới
                </button>
                <button
                  onClick={handlePaste}
                  className="px-3 py-1 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <ClipboardPaste className="w-3 h-3" /> Dán văn bản
                </button>
                
                <label className="ml-2 pl-4 border-l border-slate-200 flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={enablePauseDetection}
                    onChange={(e) => setEnablePauseDetection(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  Nhận diện [pause]
                </label>
              </div>
              <div className="text-[11px] text-slate-400 font-medium tracking-wider whitespace-nowrap ml-4">
                {text.length.toLocaleString()} / 5,000 ký tự
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 p-6 text-lg leading-relaxed text-slate-700 resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-blue-50/50"
              spellCheck="false"
              placeholder="Nhập văn bản vào đây..."
            />
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-64 bg-white border-l border-slate-200 p-6 flex flex-col shrink-0 hidden lg:flex">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Xuất tệp tin</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Định dạng</label>
              <div className="grid grid-cols-2 gap-2">
                {formats.map(f => (
                  <div
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`py-2 text-center text-xs font-bold cursor-pointer transition-colors ${
                      format === f
                        ? 'border-2 border-blue-500 bg-blue-50 text-blue-700'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Chất lượng</label>
              <select className="w-full p-2 border border-slate-200 text-xs font-medium focus:border-blue-500 outline-none text-slate-700">
                <option>High (320kbps)</option>
                <option>Medium (192kbps)</option>
                <option>Draft (64kbps)</option>
              </select>
            </div>
            <div className="mt-auto space-y-2 pt-8">
              <button
                onClick={handleDownload}
                disabled={!audioUrl || isLoading}
                className="w-full py-4 bg-slate-900 text-white font-bold text-sm tracking-wide hover:bg-black uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" /> Lưu tệp âm thanh
              </button>
              <button className="w-full py-3 border border-slate-900 text-slate-900 font-bold text-sm tracking-wide hover:bg-slate-50 uppercase flex items-center justify-center gap-2 transition-colors">
                <Share2 className="w-4 h-4" /> Chia sẻ link
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Player */}
      <footer className="h-24 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={handleGenerateAndPlay}
            disabled={isLoading || !text.trim()}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isLoading
                ? 'bg-blue-300 text-white cursor-not-allowed animate-pulse'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:scale-105 active:scale-95'
            }`}
          >
            {isLoading ? (
              <Activity className="w-6 h-6 animate-spin" />
            ) : isPlaying ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-1" />
            )}
          </button>
          
          <div className="w-32 sm:w-64 h-8 flex items-end gap-1 opacity-80">
            {/* Visualizer bars */}
            {[2, 4, 6, 3, 5, 8, 4, 2, 3, 5, 2, 4, 6, 3, 1, 4, 6, 2].map((h, i) => (
              <div
                key={i}
                className={`w-1 ${
                  isPlaying
                    ? i < 6 ? 'bg-blue-600' : i < 10 ? 'bg-blue-300' : i < 14 ? 'bg-blue-100' : 'bg-slate-100 animate-pulse'
                    : 'bg-slate-200'
                }`}
                style={{
                  height: `${h * 0.25}rem`,
                  transition: 'height 0.2s ease-in-out',
                  animationDelay: `${i * 0.05}s`
                }}
              ></div>
            ))}
          </div>
          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            {isPlaying ? '00:12 / 01:24' : '00:00 / 00:00'}
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold border uppercase transition-colors ${
            isLoading 
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : audioUrl 
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isLoading ? 'bg-amber-500 animate-ping' : audioUrl ? 'bg-green-500' : 'bg-slate-400'
            }`}></div>
            Trạng thái: {isLoading ? 'Đang xử lý...' : audioUrl ? 'Hoàn tất' : 'Sẵn sàng'}
          </div>
        </div>
      </footer>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="h-14 border-b border-slate-100 px-6 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Lịch sử chuyển đổi</h2>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <History className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Chưa có lịch sử chuyển đổi</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="border border-slate-200 p-4 bg-slate-50 hover:bg-white transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-2 py-1 bg-blue-50 border border-blue-100">
                        {voices.find(v => v.id === item.voice)?.name || item.voice}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.timestamp.toLocaleTimeString()} - {item.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 mb-4">
                      {item.text}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newAudio = new Audio(item.audioUrl);
                          newAudio.play();
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" /> Nghe lại
                      </button>
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = item.audioUrl;
                          a.download = `vietvoice-history-${item.id}.wav`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-1.5 text-xs font-bold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" /> Lưu tệp
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
