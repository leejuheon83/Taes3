'use client';

import { useState } from 'react';

const gradeOptions = [
  { value: '1학년', label: '1학년반' },
  { value: '3학년', label: '3학년반' },
];

const positionOptions = ['GK (골키퍼)', 'DF (수비수)', 'MF (미드필더)', 'FW (공격수)', '미정'];

const scheduleInfo = [
  { grade: '1학년반', times: ['일 15:00~17:00'] },
  { grade: '3학년반', times: ['금 20:00~21:30', '일 15:00~17:00'] },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    playerName: '', birthDate: '', grade: '', position: '',
    notes: '', agree: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">⚽</div>
          <h2 className="text-3xl font-black text-white mb-4">등록 신청 완료!</h2>
          <p className="text-white/60 mb-2">
            <span className="text-white font-bold">{form.playerName}</span> 선수의 등록 신청이 접수되었습니다.
          </p>
          <p className="text-white/40 text-sm mb-8">
            담당자가 확인 후 연락드리겠습니다.
          </p>
          <button
            onClick={() => { setSubmitted(false); setStep(1); setForm({ playerName: '', birthDate: '', grade: '', position: '', notes: '', agree: false }); }}
            className="px-8 py-3 font-bold text-white"
            style={{ backgroundColor: '#CC0000' }}
          >
            새 신청하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#CC0000' }}>REGISTER</div>
          <h1 className="text-4xl font-black text-white mb-2">선수 등록</h1>
          <p className="text-white/40 text-sm">학년별 반 배정 및 훈련 일정을 확인하고 등록 신청해 주세요.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Step indicator (2 steps) */}
        <div className="flex items-center gap-0 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors"
                style={{
                  backgroundColor: step >= s ? '#CC0000' : '#1a1a1a',
                  color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)',
                  border: `2px solid ${step >= s ? '#CC0000' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {s}
              </div>
              {s < 2 && (
                <div
                  className="w-16 h-0.5 transition-colors"
                  style={{ backgroundColor: step > s ? '#CC0000' : 'rgba(255,255,255,0.1)' }}
                />
              )}
            </div>
          ))}
          <div className="ml-4 text-white/40 text-sm">
            {step === 1 ? '선수 정보' : '최종 확인'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="border border-white/10 p-8" style={{ backgroundColor: '#111' }}>

            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-white mb-6">선수 정보</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/60 text-sm mb-2 font-semibold">선수 이름 *</label>
                    <input name="playerName" value={form.playerName} onChange={handleChange} required placeholder="홍길동"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none" />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2 font-semibold">생년월일 *</label>
                    <input name="birthDate" value={form.birthDate} onChange={handleChange} required type="date"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 text-white focus:border-red-700 outline-none" />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2 font-semibold">학년 *</label>
                    <select name="grade" value={form.grade} onChange={handleChange} required
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 text-white focus:border-red-700 outline-none">
                      <option value="">선택하세요</option>
                      {gradeOptions.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2 font-semibold">선호 포지션</label>
                    <select name="position" value={form.position} onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 text-white focus:border-red-700 outline-none">
                      <option value="">선택하세요</option>
                      {positionOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-white/60 text-sm mb-2 font-semibold">특이사항 / 문의</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="알레르기, 부상 이력, 기타 문의 사항 등"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 text-white placeholder-white/20 focus:border-red-700 outline-none resize-none" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button type="button" onClick={() => setStep(2)}
                    className="px-8 py-3 font-bold text-white hover:opacity-80 transition-opacity" style={{ backgroundColor: '#CC0000' }}>
                    다음 →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-white mb-6">최종 확인</h3>

                <div className="p-5 border border-white/10" style={{ backgroundColor: '#0f0f0f' }}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['선수 이름', form.playerName],
                      ['생년월일', form.birthDate],
                      ['학년', form.grade],
                      ['포지션', form.position || '미정'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-3">
                        <span className="text-white/30 flex-shrink-0 w-20">{label}</span>
                        <span className="text-white font-semibold">{value}</span>
                      </div>
                    ))}
                    {form.notes && (
                      <div className="col-span-2 flex gap-3">
                        <span className="text-white/30 flex-shrink-0 w-20">특이사항</span>
                        <span className="text-white font-semibold">{form.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 flex-shrink-0"
                    style={{ accentColor: '#CC0000' }}
                  />
                  <span className="text-white/60 text-sm">
                    개인정보 수집 및 이용에 동의합니다. 수집된 정보는 선수 등록 및 운영 목적으로만 사용됩니다.
                    <span className="text-red-400"> *</span>
                  </span>
                </label>

                <div className="flex justify-between mt-6">
                  <button type="button" onClick={() => setStep(1)} className="px-8 py-3 font-bold text-white/60 border border-white/20 hover:border-white/40 transition-colors">
                    ← 이전
                  </button>
                  <button
                    type="submit"
                    disabled={!form.agree}
                    className="px-10 py-3 font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ backgroundColor: '#CC0000' }}
                  >
                    ⚽ 등록 신청 완료
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
