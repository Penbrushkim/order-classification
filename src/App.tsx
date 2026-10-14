import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Copy, Check, FileText, ArrowRightLeft, Moon, Sun, Settings, Link as LinkIcon, List, Layout, Calculator, History, Smartphone, MessageSquare } from 'lucide-react';

const decodeColor = (code: string): string => {
  if (!code) return '';
  const tokens = [
    { c: 'NW', n: '무도금화이트' },
    { c: 'BG', n: '베이지골드' },
    { c: 'G', n: '골드' },
    { c: 'P', n: '핑크' },
    { c: 'W', n: '화이트' },
    { c: 'Y', n: '옐로우' },
    { c: 'R', n: '로즈' }
  ];
  const upper = code.toUpperCase();
  const results: string[] = [];
  let remaining = upper;
  while (remaining.length > 0) {
    let matched = false;
    for (const t of tokens) {
      if (remaining.startsWith(t.c)) {
        results.push(t.n);
        remaining = remaining.substring(t.c.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      remaining = remaining.substring(1);
    }
  }
  return results.join(' + ');
};

const initialSpecialVendors = [
  '한성', '가인', '정금체인', '아이엠주얼리', '예랑', '러브주얼리', 
  '제이앤제이', '국민골드', '봉황사', '트윙클', '스마트주얼리', 
  '풍산', '골든앤틱', '오레오', '보브젬', '개성상인', '크라이스', 
  '리골드', '수앤진'
];

const isDefaultColor = (c: string) => {
  if (!c) return true;
  const normalized = c.replace(/\s+/g, '');
  return normalized === 'rgb(23,23,23)' || 
         normalized === 'rgb(245,245,245)' || 
         normalized === 'rgb(0,0,0)' || 
         normalized === 'rgb(255,255,255)' || 
         c === 'inherit';
};

function getCharColors(rootNode: HTMLElement) {
  let text = '';
  const colors: string[] = [];
  
  function traverse(node: Node, inheritedColor: string) {
    if (node.nodeType === Node.TEXT_NODE) {
      const content = (node.textContent || '').replace(/\u00A0/g, ' ');
      text += content;
      for (let i = 0; i < content.length; i++) {
        colors.push(inheritedColor);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const style = window.getComputedStyle(element);
      const color = style.color;
      const display = style.display;
      const isBlock = display === 'block' || element.tagName === 'DIV' || element.tagName === 'P';
      
      if (element.tagName === 'BR') {
        text += '\n';
        colors.push(color);
        return;
      }
      
      if (isBlock && text.length > 0 && !text.endsWith('\n')) {
        text += '\n';
        colors.push(color);
      }
      
      for (let i = 0; i < element.childNodes.length; i++) {
        traverse(element.childNodes[i], color);
      }
      
      if (isBlock && !text.endsWith('\n')) {
        text += '\n';
        colors.push(color);
      }
    }
  }
  
  traverse(rootNode, window.getComputedStyle(rootNode).color);
  return { text, colors };
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, any[]>>({});
  const [copied, setCopied] = useState(false);
  const [bulkCopied, setBulkCopied] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [copiedSMS, setCopiedSMS] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'class1' | 'class2' | 'historyResult' | 'calculationB' | 'calculationC' | 'calculationD' | 'link'>('calculationD');
  const [activeInputTab, setActiveInputTab] = useState<'input' | 'history'>('history');
  const [historyInput, setHistoryInput] = useState('');
  const [marketPrices, setMarketPrices] = useState<Record<string, { normal: string; cash: string }>>({
    K18: { normal: '', cash: '' },
    K14: { normal: '', cash: '' },
    K24: { normal: '', cash: '' }
  });
  const [contractPrice, setContractPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [discount, setDiscount] = useState('');
  const [claspWeights, setClaspWeights] = useState<string[]>([]);
  const [specialVendors, setSpecialVendors] = useState<string[]>(initialSpecialVendors);
  const [newVendor, setNewVendor] = useState('');
  
  // State for calculationB (Order Calculation B)
  const [calcBData, setCalcBData] = useState<Record<string, { releaseWeight: string, productPrice: string }>>({});
  
  // State for calculationC (Order Calculation C)
  const [calcCData, setCalcCData] = useState<Record<string, { releaseWeight: string, productPrice: string, downPayment: string, discount: string }>>({});

  // State for calculationD (Order Calculation D - Dual Pricing)
  const [calcDData, setCalcDData] = useState<Record<string, { 
    releaseWeight: string, 
    productPrice?: string, 
    productPriceNormal?: string, 
    productPriceCash?: string, 
    downPayment: string, 
    discount: string 
  }>>({});
  
  const inputRef = useRef<HTMLDivElement>(null);
  const historyInputRef = useRef<HTMLDivElement>(null);
  const historyResultRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const output2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = historyInput.split('\n');
    const itemsWithClasp = lines.filter(line => {
      const pMatch = line.match(/(K24|24K)/i);
      return pMatch && line.includes('장식별도');
    });
    
    // Initialize claspWeights for inputs
    const count = itemsWithClasp.length;
    if (count > 0) {
      setClaspWeights(prev => {
        const next = [...prev];
        if (next.length < count) {
          for (let i = next.length; i < count; i++) {
            next.push('0');
          }
        } else if (next.length > count) {
          next.length = count;
        }
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    } else if (claspWeights.length > 0) {
      setClaspWeights([]);
    }
  }, [historyInput]);

  const parseContent = useCallback(() => {
    if (!inputRef.current) return;
    
    const { text, colors } = getCharColors(inputRef.current);
    // Make regex more robust: allow lowercase, multiple letters in serial, optional weight format, optional color, optional dollar signs
    const regex = /([Cc]\d{2}\$?(\d{2})\$?(\d{2})-\$?([A-Za-z]+)\d+)\s+(@\S+)\s+(\S+)(?:\s+([A-Za-z]{1,4}))?(?:\s+(?:(\d+(?:\.\d+)?)(?:\s+|$))?(.*))?/g;
    
    const vendors: Record<string, any[]> = {};
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Check if the line starts with @출 or @AJ
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const linePrefix = text.substring(lineStart, match.index).trim();
      if (linePrefix.startsWith('@출') || linePrefix.startsWith('@AJ')) {
        continue;
      }

      const cleanSerial = match[1].replace(/\$/g, '');
      const year = cleanSerial.substring(1, 3);
      const month = cleanSerial.length >= 5 ? cleanSerial.substring(3, 5) : (match[2] || '').replace(/\$/g, '');
      const day = cleanSerial.length >= 7 ? cleanSerial.substring(5, 7) : (match[3] || '').replace(/\$/g, '');
      const alpha = (cleanSerial.split('-')[1]?.match(/^[A-Za-z]+/)?.[0] || match[4] || '').toUpperCase().replace(/\$/g, '');
      const vendor = match[5].trim();
      
      // Robust check for @AJ and @출 exclusion
      const normalizedVendor = vendor.toUpperCase().replace(/[\u200B-\u200D\uFEFF]/g, '');
      if (normalizedVendor === '@AJ' || normalizedVendor === '@출') continue;
      
      const purity = match[6];
      const rawColor = match[7];
      const colorCode = rawColor ? rawColor.toUpperCase() : '';
      const weight = match[8] || '';
      let content = (match[9] || '').trim();
      
      content = content.replace(/(반지|팔찌|목걸이|발찌|쌍엥게지|쌍앵게지|앵게지|엥게지)(\s*)(\d+)\.0(?!\d)/g, '$1$2$3');
      content = content.replace(/(반지\s*|쌍엥게지\s*|쌍앵게지\s*|앵게지\s*|엥게지\s*)(\d+(?:\.\d+)?)(?!호)/g, '$1$2호');
      content = content.replace(/(팔찌\s*|목걸이\s*|발찌\s*)(\d+(?:\.\d+)?)(?!cm)/g, '$1$2cm');
      
      const vendorIndex = text.indexOf(vendor, match.index);
      const purityIndex = text.indexOf(purity, vendorIndex + vendor.length);
      const colorIndex = rawColor ? text.indexOf(rawColor, purityIndex + purity.length) : -1;
      
      const vendorColor = colors[vendorIndex] || 'inherit';
      let purityColor = colors[purityIndex] || 'inherit';
      const purityUpper = purity.toUpperCase();
      if (purityUpper === 'K18') purityColor = 'blue';
      else if (purityUpper === 'K14') purityColor = 'red';
      else if (purityUpper === 'K24') purityColor = 'green';
      
      const colorColorRaw = colorIndex !== -1 ? (colors[colorIndex] || 'inherit') : 'inherit';
      const colorName = colorCode ? decodeColor(colorCode) : '';
      let colorColorValue = colorColorRaw;
      
      if (colorName === '골드') colorColorValue = '#D4AF37';
      else if (colorName === '핑크') colorColorValue = '#FF1493';
      else if (colorName === '화이트') colorColorValue = '#333333';
      else if (colorName === '무도금화이트') colorColorValue = '#D2B48C';
      
      if (!vendors[vendor]) {
        vendors[vendor] = [];
      }
      
      vendors[vendor].push({
        year,
        month,
        day,
        alpha,
        vendor,
        vendorColor,
        purity,
        purityColor,
        weight,
        colorName,
        colorColor: colorColorValue,
        content
      });
    }
    
    setParsedData(vendors);
  }, []);

  useEffect(() => {
    const handle = setTimeout(parseContent, 300);
    return () => clearTimeout(handle);
  }, [trigger, parseContent]);

  useEffect(() => {
    // Removed automatic tab switching to historyResult
  }, [historyInput]);

  const handleInput = () => {
    setTrigger(t => t + 1);
  };

  const handleHistoryInput = () => {
    if (historyInputRef.current) {
      setHistoryInput(historyInputRef.current.innerText);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    if (html) {
      let cleanHtml = html.replace(/color:\s*(black|#000000|#000|rgb\(0,\s*0,\s*0\)|rgba\(0,\s*0,\s*0,\s*1\)|windowtext)[^;"]*/gi, 'color: inherit');
      cleanHtml = cleanHtml.replace(/color=["']?(black|#000000|#000)["']?/gi, 'color="inherit"');
      document.execCommand('insertHTML', false, cleanHtml);
    } else {
      document.execCommand('insertText', false, text);
    }
    setTimeout(handleInput, 10);
  };

  const handleReset = () => {
    if (inputRef.current) {
      inputRef.current.innerHTML = '';
      handleInput();
    }
  };

  const handleHistoryReset = () => {
    if (historyInputRef.current) {
      historyInputRef.current.innerHTML = '';
      setHistoryInput('');
      setContractPrice('');
      setDownPayment('');
      setDiscount('');
      setClaspWeights([]);
      setCalcBData({});
      setCalcCData({});
    }
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVendor.trim() && !specialVendors.includes(newVendor.trim())) {
      setSpecialVendors([...specialVendors, newVendor.trim()]);
      setNewVendor('');
    }
  };

  const toggleVendor = (vendor: string) => {
    if (specialVendors.includes(vendor)) {
      setSpecialVendors(specialVendors.filter(v => v !== vendor));
    } else {
      setSpecialVendors([...specialVendors, vendor]);
    }
  };

  const handleCopy = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    
    // Temporarily hide elements with 'no-copy' class
    const noCopyElements = ref.current.querySelectorAll('.no-copy') as NodeListOf<HTMLElement>;
    const originalStyles = Array.from(noCopyElements).map(el => el.style.display);
    noCopyElements.forEach(el => el.style.display = 'none');
    
    // Show elements that are specifically for copying
    const copyOnlyElements = ref.current.querySelectorAll('.no-copy-text') as NodeListOf<HTMLElement>;
    copyOnlyElements.forEach(el => el.style.display = 'block');
    
    // innerText will now include the nicely formatted hidden text and ignore the visual flex structures
    const text = ref.current.innerText;
    
    // Restore original styles
    noCopyElements.forEach((el, i) => el.style.display = originalStyles[i]);
    copyOnlyElements.forEach(el => el.style.display = 'none');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const hasOutput = Object.keys(parsedData).length > 0;

  const parseHistory = () => {
    const resultsByPurity: Record<string, { contractDons: number[], releaseDons: number[] }> = {};
    const purityOrder: string[] = [];
    
    const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
    const colorCodes = ['PNW', 'GNW', 'PG', 'GP', 'GW', 'PW', 'WG', 'WP', 'NW', 'G', 'P', 'W', 'Y', 'R'];
    const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
    const colorCodesPattern = colorCodes.join('|');
    const purityPattern = '(K14|K18|K24|14K|18K|24K)';
    
    const lines = historyInput.split('\n');
    let claspIdx = 0;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      const purityMatch = line.match(new RegExp(purityPattern, 'i'));
      const purityVal = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
      const purityKey = `K${purityVal}`;
      
      if (!resultsByPurity[purityKey]) {
        resultsByPurity[purityKey] = { contractDons: [], releaseDons: [] };
        if (!purityOrder.includes(purityKey)) purityOrder.push(purityKey);
      }
      
      // Contract Weight extraction - Added K24 special case
      const contractRegex = new RegExp(`(?:(?:${colorNamesPattern})\\s*|(?:${colorCodesPattern})\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'gi');
      let cMatch;
      const lineContractDons: number[] = [];
      while ((cMatch = contractRegex.exec(line)) !== null) {
        const val = parseFloat(cMatch[1]);
        resultsByPurity[purityKey].contractDons.push(val);
        lineContractDons.push(val);
      }
      if (lineContractDons.length === 0) {
        const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
        if (donMatch) {
          const val = parseFloat(donMatch[1]);
          resultsByPurity[purityKey].contractDons.push(val);
          lineContractDons.push(val);
        }
      }

      // 라인 시작 텍스트가 @출 일 때만 계약중량 적용 (@출고는 제외)
      const cleanPrefix = line.replace(/^\s*(?:[#\d]+[\.\)\-:#\s]*|\[\d+\]\s*|[-*·•]\s*)?/, '').trim();
      const startsWithAtChul = /^@출(?![고가-힣a-zA-Z0-9])/.test(cleanPrefix) || cleanPrefix === '@출' || /^@출\s/.test(cleanPrefix);
      const hasReleaseExplicit = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
      const isAtChul = startsWithAtChul && !hasReleaseExplicit;

      if (isAtChul) {
        // @출 시작인 경우에는 계약중량을 그대로 사용해서 계산한다.
        lineContractDons.forEach(d => {
          resultsByPurity[purityKey].releaseDons.push(d);
        });
      } else {
        // Release Weight extraction
        const releaseRegex = /@출고\s*(\d+(?:\.\d+)?)(g?)/gi;
        let rMatch;
        let foundRelease = false;
        while ((rMatch = releaseRegex.exec(line)) !== null) {
          foundRelease = true;
          const val = parseFloat(rMatch[1]);
          const isGram = rMatch[2].toLowerCase() === 'g';
          const weightInDon = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
          resultsByPurity[purityKey].releaseDons.push(weightInDon);
        }
        if (!foundRelease) {
          const explicitRegex = /(?:출고|완성|실제)\s*(\d+(?:\.\d+)?)\s*(돈|g)/gi;
          while ((rMatch = explicitRegex.exec(line)) !== null) {
            foundRelease = true;
            const val = parseFloat(rMatch[1]);
            const isGram = rMatch[2].toLowerCase() === 'g';
            const weightInDon = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
            resultsByPurity[purityKey].releaseDons.push(weightInDon);
          }
        }
      }

      // 장식별도 특수 계산: K24이면서 장식별도가 포함된 경우
      if (purityKey === 'K24' && line.includes('장식별도')) {
        // 1. K18 장식 출고중량 (텍스트상 K18 뒤의 숫자)
        const claspReleaseRegex = /K18\s*(\d+(?:\.\d+)?)/i;
        const claspReleaseMatch = line.match(claspReleaseRegex);
        if (claspReleaseMatch) {
          const claspReleaseWeightVal = isAtChul 
            ? (parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0)
            : parseFloat(claspReleaseMatch[1]);
          if (!resultsByPurity['K18']) {
            resultsByPurity['K18'] = { contractDons: [], releaseDons: [] };
            if (!purityOrder.includes('K18')) purityOrder.push('K18');
          }
          resultsByPurity['K18'].releaseDons.push(claspReleaseWeightVal);
        }

        // 2. K18 장식 계약중량 (입력란 값)
        if (claspWeights[claspIdx] !== undefined) {
          const claspContractWeightVal = parseFloat(claspWeights[claspIdx].replace(/,/g, '')) || 0;
          if (!resultsByPurity['K18']) {
            resultsByPurity['K18'] = { contractDons: [], releaseDons: [] };
            if (!purityOrder.includes('K18')) purityOrder.push('K18');
          }
          resultsByPurity['K18'].contractDons.push(claspContractWeightVal);
        }
        claspIdx++;
      }
    });
    
    const toDon = (g: number) => Math.round((g / 3.75) * 1000) / 1000;
    
    const processedResults = purityOrder.map(purity => {
      const data = resultsByPurity[purity];
      let contractDons = [...data.contractDons];
      let releaseDons = [...data.releaseDons];
      
      const totalContractDon = Number(contractDons.reduce((a, b) => a + b, 0).toFixed(3));
      const totalReleaseDon = Number(releaseDons.reduce((a, b) => a + b, 0).toFixed(3));
      
      // 계약(Contract) - 실제(Release) 로 계산
      const diffDon = Number((totalContractDon - totalReleaseDon).toFixed(3));
      const normalMarketPrice = parseFloat(marketPrices[purity]?.normal?.replace(/,/g, '') || '0');
      const cashMarketPrice = parseFloat(marketPrices[purity]?.cash?.replace(/,/g, '') || '0');
      const adjustmentNormal = Math.round(diffDon * normalMarketPrice);
      const adjustmentCash = Math.round(diffDon * (cashMarketPrice > 0 ? cashMarketPrice : normalMarketPrice));
      
      return {
        purity,
        contractDons,
        releaseDons,
        totalContractDon,
        totalReleaseDon,
        diffDon,
        adjustment: adjustmentNormal,
        adjustmentNormal,
        adjustmentCash,
        normalMarketPrice,
        cashMarketPrice,
        isClasp: purity === 'K18' && historyInput.includes('장식별도')
      };
    });
    
    const totalAdjustmentNormal = processedResults.reduce((acc, curr) => acc + curr.adjustmentNormal, 0);
    const totalAdjustmentCash = processedResults.reduce((acc, curr) => acc + curr.adjustmentCash, 0);
    const contractPriceNum = parseFloat(contractPrice.replace(/,/g, '')) || 0;
    const downPaymentNum = parseFloat(downPayment.replace(/,/g, '')) || 0;
    const finalAmountNormal = contractPriceNum - downPaymentNum - totalAdjustmentNormal;
    const finalAmountCash = contractPriceNum - downPaymentNum - totalAdjustmentCash;
    
    return {
      results: processedResults,
      totalAdjustment: totalAdjustmentNormal,
      totalAdjustmentNormal,
      totalAdjustmentCash,
      finalAmount: finalAmountNormal,
      finalAmountNormal,
      finalAmountCash
    };
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const historyResult = parseHistory();

  const sortedParsedData = Object.entries(parsedData).sort(([vendorA], [vendorB]) => {
    const isSpecialA = specialVendors.includes(vendorA.replace('@', ''));
    const isSpecialB = specialVendors.includes(vendorB.replace('@', ''));
    if (isSpecialA && !isSpecialB) return 1;
    if (!isSpecialA && isSpecialB) return -1;
    return 0;
  });

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className={`min-h-screen font-sans p-4 md:p-8 transition-colors duration-200 ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-brand-bg text-brand-primary'}`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <header className={`mb-10 flex items-start justify-between gap-4 p-6 backdrop-blur-sm rounded-3xl border shadow-sm transition-colors duration-300 ${isDark ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-white/50 border-brand-accent'}`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-300 ${isDark ? 'bg-zinc-700' : 'bg-brand-primary shadow-brand-primary/20'}`}>
                  <ArrowRightLeft className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-extrabold tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-brand-primary'}`}>주문분류 & 내역</h1>
                  <p className={`text-sm font-medium transition-colors duration-300 ${isDark ? 'text-zinc-500' : 'text-brand-secondary'}`}>주문 텍스트를 입력하면 거래처별로 자동 분류됩니다.</p>
                </div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:block">
              <span className={`text-2xl font-black italic tracking-[0.2em] select-none opacity-80 transition-colors duration-300 ${isDark ? 'text-zinc-800' : 'text-brand-accent'}`}>
                칠 / 보 / 당
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest transition-colors duration-300 ${isDark ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30' : 'bg-brand-accent/10 text-brand-primary border-brand-accent/20'}`}>
                V3.6.0
              </span>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-3 rounded-2xl shadow-md border transition-all active:scale-95 ${isDark ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800' : 'bg-white text-brand-primary border-brand-accent hover:bg-zinc-50'}`}
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-[calc(100vh-18rem)] min-h-[600px]">
            {/* Input Section */}
            <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-zinc-300/50 dark:shadow-none border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                  <button
                    onClick={() => setActiveInputTab('input')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeInputTab === 'input' 
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    입력란
                  </button>
                  <button
                    onClick={() => {
                      setActiveInputTab('history');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeInputTab === 'history' 
                        ? 'bg-brand-accent text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    주문내용
                  </button>
                </div>
                  <button 
                    onClick={activeInputTab === 'input' ? handleReset : handleHistoryReset}
                    className={`text-xs font-bold transition-all px-4 py-2 rounded-xl ${
                      isDark ? 'text-zinc-500 hover:text-brand-accent hover:bg-brand-accent/10' : 'text-brand-secondary hover:text-brand-accent hover:bg-brand-accent/5'
                    }`}
                  >
                    초기화
                  </button>
              </div>
              {activeInputTab === 'input' ? (
                <div
                  ref={inputRef}
                  contentEditable
                  onInput={handleInput}
                  onPaste={handlePaste}
                  data-placeholder="여기에 주문 텍스트를 붙여넣으세요..."
                    className={`flex-1 w-full p-8 focus:outline-none overflow-auto text-[15px] leading-relaxed editable scrollbar-thin transition-colors duration-300 ${
                      isDark ? 'bg-zinc-800/20 scrollbar-thumb-zinc-800' : 'bg-[#F0E7D6] scrollbar-thumb-brand-secondary'
                    }`}
                    suppressContentEditableWarning
                />
              ) : (
                <div
                  ref={historyInputRef}
                  contentEditable
                  onInput={handleHistoryInput}
                  onPaste={handlePaste}
                  data-placeholder="여기에 내역 텍스트를 입력하세요... (예: 핑크 12.5g ... @출고 12.3g)"
                  className={`flex-1 w-full p-8 focus:outline-none overflow-auto text-[15px] leading-relaxed editable scrollbar-thin transition-colors duration-300 ${
                    isDark ? 'bg-zinc-800/40 scrollbar-thumb-zinc-800' : 'bg-[#F0E7D6] scrollbar-thumb-brand-secondary'
                  }`}
                  suppressContentEditableWarning
                />
              )}
            </div>

            {/* Output Section */}
            <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-zinc-300/50 dark:shadow-none border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                  <button
                    onClick={() => setActiveTab('class1')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'class1' 
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    분류1
                  </button>
                  <button
                    onClick={() => setActiveTab('class2')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'class2' 
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    분류2
                  </button>
                  <button
                    onClick={() => setActiveTab('historyResult')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'historyResult' 
                        ? 'bg-brand-accent text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    주문계산A
                  </button>
                  <button
                    onClick={() => setActiveTab('calculationB')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'calculationB' 
                        ? 'bg-brand-accent text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    주문계산B
                  </button>
                  <button
                    onClick={() => setActiveTab('calculationC')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'calculationC' 
                        ? 'bg-brand-accent text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    주문계산C
                  </button>
                  <button
                    onClick={() => setActiveTab('calculationD')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'calculationD' 
                        ? 'bg-brand-accent text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    주문계산D
                  </button>
                  <button
                    onClick={() => setActiveTab('link')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'link' 
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    주문링크
                  </button>
                </div>
                {activeTab !== 'link' && activeTab !== 'class1' && activeTab !== 'class2' && (
                  <button
                    onClick={() => handleCopy(
                      activeTab === 'class1' ? outputRef : 
                      activeTab === 'class2' ? output2Ref : 
                      historyResultRef
                    )}
                    disabled={activeTab === 'historyResult' || activeTab === 'calculationB' || activeTab === 'calculationC' || activeTab === 'calculationD' ? false : !hasOutput}
                    className={`flex items-center gap-2 text-xs font-bold text-white transition-all px-4 py-2.5 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-brand-accent hover:brightness-110 shadow-brand-accent/20'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '복사됨' : '복사하기'}
                  </button>
                )}
              </div>
              <div className={`flex-1 w-full p-6 overflow-auto transition-colors duration-300 ${
                activeTab === 'link' 
                  ? (isDark ? 'bg-brand-accent/5' : 'bg-brand-accent/5')
                  : (isDark ? 'bg-brand-primary/10' : 'bg-[#F0E7D6]')
              }`}>
                {activeTab === 'class1' && (
                  hasOutput ? (
                    <div className="space-y-4">
                      {/* New Filtered Copy Button */}
                      <div className="flex justify-start mb-4 no-copy">
                        <button
                          onClick={async () => {
                            const filteredItems = sortedParsedData
                              .filter(([vendor]) => !specialVendors.includes(vendor.replace('@', '')));
                            
                            const filteredText = filteredItems.map(([vendor, orders]) => {
                                const orderLines = (orders as any[]).map((order, index) => {
                                  let weightStr = '';
                                  if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                    let num = order.weight;
                                    if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                    weightStr = num + '돈 ';
                                  }
                                  const colorStr = order.colorName ? `${order.colorName} ` : '';
                                  const seq = (orders as any[]).length > 1 ? `${index + 1}- ` : '';
                                  return `${seq}${order.purity} ${colorStr}${weightStr}${order.content} [${order.month}/${order.day}-${order.alpha}]`;
                                }).join('\n');
                                return `${vendor}\n${orderLines}`;
                              }).join('\n\n');

                            const filteredHtml = filteredItems.map(([vendor, orders]) => {
                                const ordersList = orders as any[];
                                const vendorColor = ordersList[0]?.vendorColor;
                                const colorStyle = vendorColor && !isDefaultColor(vendorColor) ? `color: ${vendorColor};` : '';
                                
                                const orderLines = ordersList.map((order, index) => {
                                  let weightStr = '';
                                  if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                    let num = order.weight;
                                    if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                    weightStr = `<b>${num}돈 </b>`;
                                  }
                                  
                                  const purity = order.purity.toUpperCase();
                                  let purityStyle = '';
                                  if (purity === 'K18') purityStyle = 'color: blue;';
                                  else if (purity === 'K14') purityStyle = 'color: red;';
                                  else if (purity === 'K24') purityStyle = 'color: green; font-weight: bold;';
                                  
                                  const purityHtml = `<span style="${purityStyle}">${order.purity}</span>`;
                                  
                                  let colorHtml = '';
                                  if (order.colorName) {
                                    let colorStyle = 'font-weight: bold;';
                                    if (order.colorName === '골드') colorStyle += ' color: #D4AF37;';
                                    else if (order.colorName === '핑크') colorStyle += ' color: #FF1493;';
                                    else if (order.colorName === '화이트') colorStyle += ' color: #333333;';
                                    else if (order.colorName === '무도금화이트') colorStyle += ' color: #D2B48C;';
                                    colorHtml = ` <span style="${colorStyle}">${order.colorName}</span>`;
                                  }

                                  const seq = ordersList.length > 1 ? `${index + 1}- ` : '';
                                  return `<div>${seq}${purityHtml}${colorHtml} ${weightStr}${order.content} [${order.month}/${order.day}-${order.alpha}]</div>`;
                                }).join('');
                                return `<div><b style="${colorStyle}">${vendor}</b></div>${orderLines}`;
                              }).join('<br>');

                            const specialItems = sortedParsedData
                              .filter(([vendor]) => specialVendors.includes(vendor.replace('@', '')));
                            const specialNames = specialItems.map(([vendor]) => vendor.replace('@', ''));

                            let finalCopyText = filteredText;
                            if (specialNames.length > 0) {
                              finalCopyText = finalCopyText 
                                ? finalCopyText + '\n\n' + specialNames.join(' / ')
                                : specialNames.join(' / ');
                            }

                            let finalCopyHtml = filteredHtml;
                            if (specialNames.length > 0) {
                              finalCopyHtml = finalCopyHtml
                                ? finalCopyHtml + '<br><br><div><b>' + specialNames.join(' / ') + '</b></div>'
                                : '<div><b>' + specialNames.join(' / ') + '</b></div>';
                            }

                            if (finalCopyText) {
                              try {
                                const blobText = new Blob([finalCopyText], { type: 'text/plain' });
                                const blobHtml = new Blob([finalCopyHtml], { type: 'text/html' });
                                await navigator.clipboard.write([
                                  new ClipboardItem({
                                    'text/plain': blobText,
                                    'text/html': blobHtml
                                  })
                                ]);
                                setBulkCopied(true);
                                setTimeout(() => setBulkCopied(false), 2000);
                              } catch (e) { 
                                console.error('Copy failed:', e);
                                try {
                                  await navigator.clipboard.writeText(finalCopyText);
                                  setBulkCopied(true);
                                  setTimeout(() => setBulkCopied(false), 2000);
                                } catch (innerE) {
                                  console.error('Text copy also failed:', innerE);
                                }
                              }
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 ${
                            bulkCopied ? 'bg-green-600' : 'bg-brand-primary hover:bg-brand-primary/90'
                          }`}
                        >
                          {bulkCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              복사 완료!
                            </>
                          ) : (
                            <>
                              <List className="w-3.5 h-3.5" />
                              주문목록 복사 (링크제외)
                            </>
                          )}
                        </button>
                      </div>

                      <div ref={outputRef} className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                        {sortedParsedData.map(([vendor, orders], vIndex) => {
                        const isSpecial = specialVendors.includes(vendor.replace('@', ''));
                        const currentOrders = orders as any[];
                        const showIndex = !isSpecial && currentOrders.length > 1;
                        
                        return (
                          <div key={vendor} className={vIndex > 0 ? 'mt-6' : ''}>
                            <div className="flex items-center gap-2 mb-1 group">
                              <span className="font-bold" style={isDefaultColor(currentOrders[0].vendorColor) ? undefined : { color: currentOrders[0].vendorColor }}>{vendor}</span>
                              {isSpecial && <span className="text-xs font-bold text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded">[주문링크]</span>}
                              {isSpecial && (
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const orderLines = currentOrders.map((order: any, index: number) => {
                                      let weightStr = '';
                                      if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                        let num = order.weight;
                                        if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                        weightStr = num + '돈 ';
                                      }
                                      const colorStr = order.colorName ? `${order.colorName} ` : '';
                                      const seq = !isSpecial && currentOrders.length > 1 ? `${index + 1}- ` : '';
                                      return `${seq}${order.purity} ${colorStr}${weightStr}${order.content} [${order.month}/${order.day}-${order.alpha}]`;
                                    }).join('\n');
                                    
                                    const vendorColor = currentOrders[0]?.vendorColor;
                                    const colorStyle = vendorColor && !isDefaultColor(vendorColor) ? `color: ${vendorColor};` : '';
                                    
                                    const htmlLines = currentOrders.map((order: any, index: number) => {
                                      let weightStr = '';
                                      if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                        let num = order.weight;
                                        if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                        weightStr = `<b>${num}돈 </b>`;
                                      }
                                      
                                      const purity = order.purity.toUpperCase();
                                      let purityStyle = '';
                                      if (purity === 'K18') purityStyle = 'color: blue;';
                                      else if (purity === 'K14') purityStyle = 'color: red;';
                                      else if (purity === 'K24') purityStyle = 'color: green; font-weight: bold;';
                                      
                                      const purityHtml = `<span style="${purityStyle}">${order.purity}</span>`;
                                      
                                      let colorHtml = '';
                                      if (order.colorName) {
                                        let colorStyle = 'font-weight: bold;';
                                        if (order.colorName === '골드') colorStyle += ' color: #D4AF37;';
                                        else if (order.colorName === '핑크') colorStyle += ' color: #FF1493;';
                                        else if (order.colorName === '화이트') colorStyle += ' color: #333333;';
                                        else if (order.colorName === '무도금화이트') colorStyle += ' color: #D2B48C;';
                                        colorHtml = ` <span style="${colorStyle}">${order.colorName}</span>`;
                                      }

                                      const seq = !isSpecial && currentOrders.length > 1 ? `${index + 1}- ` : '';
                                      return `<div>${seq}${purityHtml}${colorHtml} ${weightStr}${order.content} [${order.month}/${order.day}-${order.alpha}]</div>`;
                                    }).join('');

                                    const textToCopy = isSpecial ? orderLines : `${vendor}\n${orderLines}`;
                                    const htmlToCopy = isSpecial ? htmlLines : `<div><b style="${colorStyle}">${vendor}</b></div>${htmlLines}`;

                                    try {
                                      const blobText = new Blob([textToCopy], { type: 'text/plain' });
                                      const blobHtml = new Blob([htmlToCopy], { type: 'text/html' });
                                      await navigator.clipboard.write([
                                        new ClipboardItem({
                                          'text/plain': blobText,
                                          'text/html': blobHtml
                                        })
                                      ]);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    } catch (err) {
                                      console.error('Failed to copy formatted:', err);
                                      await navigator.clipboard.writeText(textToCopy);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-zinc-500 hover:text-brand-primary border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center"
                                  title="이 거래처만 복사"
                                >
                                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                            <div>
                              {(orders as any[]).map((order: any, index: number) => {
                                const isK24 = order.purity.toUpperCase() === 'K24';
                                
                                const renderContent = (text: string) => {
                                  const parts = text.split(/(\[K18 장식별도\]|\[K18 장식환산\])/);
                                  return parts.map((part, i) => {
                                    if (part === '[K18 장식별도]') {
                                      return <span key={i} className="font-bold" style={{ color: '#E06666' }}>{part}</span>;
                                    }
                                    if (part === '[K18 장식환산]') {
                                      return <span key={i} className="font-bold" style={{ color: '#755DAF' }}>{part}</span>;
                                    }
                                    return part;
                                  });
                                };

                                const formatWeight = (w: string) => {
                                  if (!w) return '';
                                  let num = w;
                                  if (num.endsWith('.0')) {
                                    num = num.substring(0, num.length - 2);
                                  }
                                  return num + '돈';
                                };

                                return (
                                  <div key={index}>
                                    {showIndex && `${index + 1}- `}
                                    <span 
                                      className={isK24 ? "font-bold" : ""}
                                      style={isDefaultColor(order.purityColor) ? undefined : { color: order.purityColor }}
                                    >
                                      {order.purity}
                                    </span>{' '}
                                    {order.colorName && (
                                      <>
                                        <span className="font-bold" style={isDefaultColor(order.colorColor) ? undefined : { color: order.colorColor }}>{order.colorName}</span>{' '}
                                      </>
                                    )}
                                    {(isK24 || vendor === '@공장') && order.weight && (
                                      <>
                                        <span className="font-bold" style={{ color: '#FB0480' }}>{formatWeight(order.weight)}</span>{' '}
                                      </>
                                    )}
                                    {renderContent(order.content)} [{order.month}/{order.day}-{order.alpha}]
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyState />
                )
              )}

                {activeTab === 'class2' && (
                  hasOutput ? (
                    <div className="space-y-4">
                      {/* Bulk Copy for Class 2 */}
                      <div className="flex justify-start mb-4 no-copy">
                        <button
                          onClick={async () => {
                            const filteredData = sortedParsedData
                              .filter(([vendor]) => !specialVendors.includes(vendor.replace('@', '')));
                            
                            const fullText = filteredData.map(([vendor, orders]) => {
                                const orderLines = (orders as any[]).map((order) => {
                                  let weightStr = '';
                                  if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                    let num = order.weight;
                                    if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                    weightStr = num + '돈 ';
                                  }
                                  const colorStr = order.colorName ? `${order.colorName} ` : '';
                                  const y = (order.year || '').replace(/\$/g, '');
                                  const m = (order.month || '').replace(/\$/g, '');
                                  const d = (order.day || '').replace(/\$/g, '');
                                  const a = (order.alpha || '').replace(/\$/g, '');
                                  return `${order.purity} ${colorStr}${weightStr}${order.content} [${y}/${m}/${d}-${a}]`;
                                }).join('\n');
                                return `${vendor}\n${orderLines}`;
                              }).join('\n\n');

                            const fullHtml = filteredData.map(([vendor, orders]) => {
                                const ordersList = orders as any[];
                                const vendorColor = ordersList[0]?.vendorColor;
                                const colorStyle = vendorColor && !isDefaultColor(vendorColor) ? `color: ${vendorColor};` : '';
                                
                                const orderLines = ordersList.map((order) => {
                                  let weightStr = '';
                                  if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                    let num = order.weight;
                                    if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                    weightStr = `<b>${num}돈 </b>`;
                                  }
                                  
                                  const purity = order.purity.toUpperCase();
                                  let purityStyle = '';
                                  if (purity === 'K18') purityStyle = 'color: blue;';
                                  else if (purity === 'K14') purityStyle = 'color: red;';
                                  else if (purity === 'K24') purityStyle = 'color: green; font-weight: bold;';
                                  
                                  const purityHtml = `<span style="${purityStyle}">${order.purity}</span>`;
                                  
                                  let colorHtml = '';
                                  if (order.colorName) {
                                    let colorStyle = 'font-weight: bold;';
                                    if (order.colorName === '골드') colorStyle += ' color: #D4AF37;';
                                    else if (order.colorName === '핑크') colorStyle += ' color: #FF1493;';
                                    else if (order.colorName === '화이트') colorStyle += ' color: #333333;';
                                    else if (order.colorName === '무도금화이트') colorStyle += ' color: #D2B48C;';
                                    colorHtml = ` <span style="${colorStyle}">${order.colorName}</span>`;
                                  }

                                  const y = (order.year || '').replace(/\$/g, '');
                                  const m = (order.month || '').replace(/\$/g, '');
                                  const d = (order.day || '').replace(/\$/g, '');
                                  const a = (order.alpha || '').replace(/\$/g, '');
                                  return `<div>${purityHtml}${colorHtml} ${weightStr}${order.content} [${y}/${m}/${d}-${a}]</div>`;
                                }).join('');
                                return `<div><b style="${colorStyle}">${vendor}</b></div>${orderLines}`;
                              }).join('<br>');

                            try {
                              const blobText = new Blob([fullText], { type: 'text/plain' });
                              const blobHtml = new Blob([fullHtml], { type: 'text/html' });
                              await navigator.clipboard.write([
                                new ClipboardItem({
                                  'text/plain': blobText,
                                  'text/html': blobHtml
                                })
                              ]);
                              setBulkCopied(true);
                              setTimeout(() => setBulkCopied(false), 2000);
                            } catch (e) {
                              console.error('Bulk copy class2 failed:', e);
                              try {
                                await navigator.clipboard.writeText(fullText);
                                setBulkCopied(true);
                                setTimeout(() => setBulkCopied(false), 2000);
                              } catch (innerE) {
                                console.error('Bulk copy text fallback also failed:', innerE);
                              }
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 ${
                            bulkCopied ? 'bg-green-600' : 'bg-brand-primary hover:bg-brand-primary/90'
                          }`}
                        >
                          {bulkCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              복사 완료!
                            </>
                          ) : (
                            <>
                              <List className="w-3.5 h-3.5" />
                              주문목록 전체 복사 (서식유지)
                            </>
                          )}
                        </button>
                      </div>

                      <div ref={output2Ref} className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                      {sortedParsedData
                        .filter(([vendor]) => !specialVendors.includes(vendor.replace('@', '')))
                        .map(([vendor, orders], vIndex) => (
                          <div key={vendor} className={vIndex > 0 ? 'mt-6' : ''}>
                            <div className="flex items-center gap-2 mb-1 group">
                              <span className="font-bold" style={isDefaultColor(orders[0].vendorColor) ? undefined : { color: orders[0].vendorColor }}>{vendor}</span>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ordersList = orders as any[];
                                  const orderLines = ordersList.map((order: any) => {
                                    let weightStr = '';
                                    if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                      let num = order.weight;
                                      if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                      weightStr = num + '돈 ';
                                    }
                                    const colorStr = order.colorName ? `${order.colorName} ` : '';
                                    const y = (order.year || '').replace(/\$/g, '');
                                    const m = (order.month || '').replace(/\$/g, '');
                                    const d = (order.day || '').replace(/\$/g, '');
                                    const a = (order.alpha || '').replace(/\$/g, '');
                                    return `${order.purity} ${colorStr}${weightStr}${order.content} [${y}/${m}/${d}-${a}]`;
                                  }).join('\n');
                                  
                                  const vendorColor = ordersList[0]?.vendorColor;
                                  const colorStyle = vendorColor && !isDefaultColor(vendorColor) ? `color: ${vendorColor};` : '';
                                  
                                  const htmlLines = ordersList.map((order: any) => {
                                    let weightStr = '';
                                    if ((order.purity.toUpperCase() === 'K24' || vendor === '@공장') && order.weight) {
                                      let num = order.weight;
                                      if (num.endsWith('.0')) num = num.substring(0, num.length - 2);
                                      weightStr = `<b>${num}돈 </b>`;
                                    }
                                    
                                    const purity = order.purity.toUpperCase();
                                    let purityStyle = '';
                                    if (purity === 'K18') purityStyle = 'color: blue;';
                                    else if (purity === 'K14') purityStyle = 'color: red;';
                                    else if (purity === 'K24') purityStyle = 'color: green; font-weight: bold;';
                                    
                                    const purityHtml = `<span style="${purityStyle}">${order.purity}</span>`;
                                    
                                    let colorHtml = '';
                                    if (order.colorName) {
                                      let colorStyle = 'font-weight: bold;';
                                      if (order.colorName === '골드') colorStyle += ' color: #D4AF37;';
                                      else if (order.colorName === '핑크') colorStyle += ' color: #FF1493;';
                                      else if (order.colorName === '화이트') colorStyle += ' color: #333333;';
                                      else if (order.colorName === '무도금화이트') colorStyle += ' color: #D2B48C;';
                                      colorHtml = ` <span style="${colorStyle}">${order.colorName}</span>`;
                                    }

                                    const y = (order.year || '').replace(/\$/g, '');
                                    const m = (order.month || '').replace(/\$/g, '');
                                    const d = (order.day || '').replace(/\$/g, '');
                                    const a = (order.alpha || '').replace(/\$/g, '');
                                    return `<div>${purityHtml}${colorHtml} ${weightStr}${order.content} [${y}/${m}/${d}-${a}]</div>`;
                                  }).join('');

                                  const textToCopy = orderLines; 
                                  const htmlToCopy = `<div><b style="${colorStyle}">${vendor}</b></div>${htmlLines}`;

                                  try {
                                    const blobText = new Blob([textToCopy], { type: 'text/plain' });
                                    const blobHtml = new Blob([htmlToCopy], { type: 'text/html' });
                                    await navigator.clipboard.write([
                                      new ClipboardItem({
                                        'text/plain': blobText,
                                        'text/html': blobHtml
                                      })
                                    ]);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                  } catch (err) {
                                    console.error('Failed to copy formatted:', err);
                                    await navigator.clipboard.writeText(textToCopy);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-zinc-500 hover:text-brand-primary border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center"
                                title="이 거래처만 복사"
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div>
                              {(orders as any[]).map((order: any, index: number) => {
                                const isK24 = order.purity.toUpperCase() === 'K24';
                                
                                const renderContent = (text: string) => {
                                  const parts = text.split(/(\[K18 장식별도\]|\[K18 장식환산\])/);
                                  return parts.map((part, i) => {
                                    if (part === '[K18 장식별도]') {
                                      return <span key={i} className="font-bold" style={{ color: '#E06666' }}>{part}</span>;
                                    }
                                    if (part === '[K18 장식환산]') {
                                      return <span key={i} className="font-bold" style={{ color: '#755DAF' }}>{part}</span>;
                                    }
                                    return part;
                                  });
                                };

                                const formatWeight = (w: string) => {
                                  if (!w) return '';
                                  let num = w;
                                  if (num.endsWith('.0')) {
                                    num = num.substring(0, num.length - 2);
                                  }
                                  return num + '돈';
                                };
                                
                                return (
                                  <div key={index}>
                                    <span 
                                      className={isK24 ? "font-bold" : ""}
                                      style={isDefaultColor(order.purityColor) ? undefined : { color: order.purityColor }}
                                    >
                                      {order.purity}
                                    </span>{' '}
                                    {order.colorName && (
                                      <>
                                        <span className="font-bold" style={isDefaultColor(order.colorColor) ? undefined : { color: order.colorColor }}>{order.colorName}</span>{' '}
                                      </>
                                    )}
                                    {order.weight && (
                                      <>
                                        <span className="font-bold" style={{ color: '#FB0480' }}>{formatWeight(order.weight)}</span>{' '}
                                      </>
                                    )}
                                    {renderContent(order.content)} [{(order.year || '').replace(/\$/g, '')}/{(order.month || '').replace(/\$/g, '')}/{(order.day || '').replace(/\$/g, '')}-{(order.alpha || '').replace(/\$/g, '')}]
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState />
                  )
                )}

                {activeTab === 'calculationB' && (
                  <div className="space-y-6">
                    {/* Global Inputs for Order Calculation B */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/40 dark:bg-zinc-800/20 p-4 rounded-2xl border border-white/50 dark:border-zinc-700/30">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">선금</label>
                          <input
                            type="text"
                            value={downPayment}
                            onChange={(e) => setDownPayment(e.target.value)}
                            placeholder="선금"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">할인(천원)</label>
                          <input
                            type="text"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            placeholder="할인"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['K18', 'K14', 'K24'].map((p) => {
                          const isK18 = p === 'K18';
                          const isK14 = p === 'K14';
                          const colorClass = isK18 ? 'text-brand-primary' : isK14 ? 'text-rose-600' : 'text-brand-accent';
                          const borderClass = isK18 ? 'border-brand-primary/30 focus:border-brand-primary' : isK14 ? 'border-brand-secondary/30 focus:border-brand-secondary' : 'border-brand-accent/30 focus:border-brand-accent';
                          return (
                            <div key={p} className="space-y-1.5">
                              <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${colorClass}`}>{p} 시세</label>
                              <input
                                type="text"
                                value={marketPrices[p]?.cash || ''}
                                onChange={(e) => setMarketPrices(prev => ({
                                  ...prev,
                                  [p]: { ...prev[p], cash: e.target.value }
                                }))}
                                placeholder={`${p} 시세`}
                                className={`w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border rounded-xl focus:outline-none focus:ring-1 ${borderClass}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual Item Calculations based on 'Order Content' text */}
                    <div ref={historyResultRef} className="space-y-4">
                      {(() => {
                        let claspCounter = 0;
                        return historyInput.trim() ? (
                          historyInput.split('\n').filter(line => line.trim()).map((line, idx) => {
                            // Extraction logic similar to parseHistory but per line
                            const purityMatch = line.match(/(K14|K18|K24|14K|18K|24K)/i);
                            const purityStr = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
                            const purityKey = `K${purityStr}`;
                            const isK24 = purityKey === 'K24';
                            const hasClasp = line.includes('장식별도');
                            
                            // Contract Weight extraction
                            const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
                            const colorCodesPattern = '(?:PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)';
                            const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
                            // Added K24 support to contract weight extraction
                            const contractRegex = new RegExp(`(?:${colorNamesPattern}\\s*|${colorCodesPattern}\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'i');
                            const contractMatch = line.match(contractRegex);
                            let contractWeightNum = contractMatch ? parseFloat(contractMatch[1]) : 0;
                            if (!contractWeightNum) {
                              const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
                              if (donMatch) contractWeightNum = parseFloat(donMatch[1]);
                            }

                            // Release Weight extraction
                            const hasReleaseExplicit = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
                            const isAtChul = line.includes('@출') && !hasReleaseExplicit;
                            let releaseWeightNum = 0;
                            if (isAtChul) {
                              releaseWeightNum = contractWeightNum;
                            } else if (hasReleaseExplicit) {
                              const releaseMatch = line.match(/@출고\s*(\d+(?:\.\d+)?)(g?)/i);
                              if (releaseMatch) {
                                const val = parseFloat(releaseMatch[1]);
                                const isGram = releaseMatch[2].toLowerCase() === 'g';
                                releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                              }
                            }

                            // K18 Clasp extraction
                            let claspIdx = -1;
                            let claspContractWeightNum = 0;
                            let claspReleaseWeightNum = 0;
                            let claspAdjustment = 0;
                            
                            if (isK24 && hasClasp) {
                              claspIdx = claspCounter++;
                              claspContractWeightNum = parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0;
                              if (isAtChul) {
                                claspReleaseWeightNum = claspContractWeightNum;
                              } else {
                                const claspReleaseMatch = line.match(/K18\s*(\d+(?:\.\d+)?)/i);
                                if (claspReleaseMatch) {
                                  claspReleaseWeightNum = parseFloat(claspReleaseMatch[1]);
                                }
                              }
                              
                              const marketPriceK18Cash = parseFloat(marketPrices['K18']?.cash?.replace(/,/g, '') || '0');
                              const claspDiff = claspContractWeightNum - claspReleaseWeightNum;
                              claspAdjustment = Math.round(claspDiff * marketPriceK18Cash);
                            }

                            const itemKey = `line-${idx}`;
                            const currentItem = calcBData[itemKey] || { productPrice: '' };
                            
                            const diffDon = Number((contractWeightNum - releaseWeightNum).toFixed(3));
                            const marketPriceCash = parseFloat(marketPrices[purityKey]?.cash?.replace(/,/g, '') || '0');
                            const mainAdjustment = Math.round(diffDon * marketPriceCash);
                            
                            const isHwansan = purityKey === 'K24' && (line.includes('장식환산') || line.includes('[K18 장식환산]'));
                            const totalAdjustment = (isHwansan || isAtChul) ? 0 : (mainAdjustment + claspAdjustment);
                            
                            const productPriceNum = parseFloat(currentItem.productPrice.replace(/,/g, '')) || 0;
                            const finalPrice = productPriceNum - totalAdjustment;

                            const isAddition = totalAdjustment < 0;
                            const absAdjustment = Math.abs(totalAdjustment);

                            // Refined Item Name extraction
                            const jewelryCategories = ['반지', '팔찌', '목걸이', '메달', '귀걸이', '체인', '펜던트', '발찌'];
                            let itemName = '제품';
                            for (const cat of jewelryCategories) {
                              if (line.includes(cat)) {
                                itemName = cat;
                                break;
                              }
                            }
                            if (itemName === '제품') {
                              const genericMatch = line.match(/[가-힣]{2,}/);
                              if (genericMatch) itemName = genericMatch[0];
                            }

                            return (
                              <div key={idx} className="bg-white/60 dark:bg-zinc-800/40 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex-1 min-w-[200px]">
                                    <p className="text-xs text-zinc-400 font-bold mb-1 uppercase tracking-tighter no-copy">{purityKey} Item</p>
                                    <p className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-1 no-copy">{line}</p>
                                  </div>
                                  <div className="flex gap-3 no-copy">
                                    {isK24 && hasClasp && !isAtChul && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-brand-primary uppercase tracking-widest pl-1">K18장식 계약중량</label>
                                        <input
                                          type="text"
                                          value={claspWeights[claspIdx] || '0'}
                                          onChange={(e) => {
                                            const next = [...claspWeights];
                                            next[claspIdx] = e.target.value;
                                            setClaspWeights(next);
                                          }}
                                          placeholder="장식 계약"
                                          className="w-24 px-3 py-1.5 text-xs bg-brand-primary/5 dark:bg-zinc-900 border border-brand-primary/20 rounded-lg focus:ring-1 focus:ring-brand-primary"
                                        />
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">제품가(천원)</label>
                                      <input
                                        type="text"
                                        value={currentItem.productPrice}
                                        onChange={(e) => setCalcBData({
                                          ...calcBData,
                                          [itemKey]: { ...currentItem, productPrice: e.target.value }
                                        })}
                                        placeholder="제품가"
                                        className="w-32 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Calculation result display */}
                                {(line.includes('@출') || (isK24 && hasClasp)) && (
                                  <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-3 space-y-2">
                                    {isAtChul ? (
                                      <div className="flex items-start gap-2 no-copy">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5"></div>
                                        <div className="text-sm">
                                          <div>
                                            <span className="font-bold text-brand-primary dark:text-brand-accent">{idx + 1}- {itemName} {contractWeightNum}돈</span>
                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">@출 (계약중량)</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2 no-copy">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5"></div>
                                        <div className="text-sm">
                                          <div>
                                            <span className="font-bold text-brand-primary dark:text-brand-accent">{idx + 1}- {isK24 ? `${purityKey} ${contractWeightNum || releaseWeightNum}돈 ${itemName}` : itemName}</span>{' '}
                                            <span className="font-mono text-zinc-400">
                                              {isHwansan ? (
                                                <>[K18 장식환산]</>
                                              ) : isK24 && diffDon === 0 ? (
                                                null
                                              ) : (
                                                <>{contractWeightNum}-{releaseWeightNum}={Math.abs(diffDon).toFixed(3)}돈{diffDon < 0 ? ' 추가' : ''}</>
                                              )}
                                            </span>
                                            {hasClasp && (
                                              <span className="font-mono text-zinc-400 ml-1">
                                                / K18 장식 {claspContractWeightNum}-{claspReleaseWeightNum}={parseFloat(Math.abs(claspContractWeightNum - claspReleaseWeightNum).toFixed(3))}돈{claspContractWeightNum - claspReleaseWeightNum < 0 ? ' 추가' : ''}
                                              </span>
                                            )}
                                          </div>
                                          {!isHwansan && (
                                            <div className="mt-1 text-xs">
                                              <span className="inline-flex items-center gap-1">
                                                <span className="font-bold text-zinc-500">▷</span>
                                                <span className="font-bold text-brand-primary dark:text-brand-accent">{formatNumber(absAdjustment)}{isAddition ? ' 추가' : ''}</span>
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 pl-4 no-copy">
                                      <div className="w-2 h-2 border-l-2 border-b-2 border-zinc-200 dark:border-zinc-700"></div>
                                      <span className="text-sm font-bold">
                                        {currentItem.productPrice ? (
                                          isAtChul ? (
                                            <span className="text-lg tracking-tight text-zinc-900 dark:text-zinc-100 no-copy">
                                              M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(productPriceNum)}</span>
                                            </span>
                                          ) : isHwansan ? (
                                            <>
                                              <span className="text-zinc-400 font-mono">M{formatNumber(productPriceNum)}</span>
                                              <span className="ml-1 text-lg tracking-tight text-zinc-900 dark:text-zinc-100 no-copy">
                                                (M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(productPriceNum)}</span>)
                                              </span>
                                            </>
                                          ) : (
                                            <div>
                                              <span className="text-zinc-400 font-mono">M{formatNumber(productPriceNum)}{isAddition ? '+' : '-'}{formatNumber(absAdjustment)}= {finalPrice < 0 ? `M${formatNumber(Math.abs(finalPrice))} 남음 (보관)` : `M${formatNumber(finalPrice)}`}</span>
                                              <span className="ml-1 text-base tracking-tight text-zinc-900 dark:text-zinc-100 no-copy">
                                                ({finalPrice < 0 ? <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(Math.abs(finalPrice))}</span> 남음 (보관)</> : <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></>})
                                              </span>
                                            </div>
                                          )
                                        ) : (
                                          <span className="text-zinc-300 italic font-normal no-copy">제품가를 입력하면 최종 정산액이 계산됩니다.</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <EmptyState />
                        );
                      })()}
                    </div>
                      
                      {/* Final Total Calculation Summary */}
                      {historyInput.trim() && (
                        <div className="space-y-6">
                          {(() => {
                            let claspSummaryCounter = 0;
                            const hasCashPriceGlobal = ['K18', 'K14', 'K24'].some(p => {
                              const c = parseFloat(marketPrices[p]?.cash?.replace(/,/g, '') || '0');
                              const n = parseFloat(marketPrices[p]?.normal?.replace(/,/g, '') || '0');
                              return c > 0 && c !== n;
                            });

                            const items = historyInput.split('\n').filter(line => line.trim()).map((line, idx) => {
                              const purityMatch = line.match(/(K14|K18|K24|14K|18K|24K)/i);
                              const purityStr = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
                              const purityKey = `K${purityStr}`;
                              const isK24 = purityKey === 'K24';
                              const hasClasp = line.includes('장식별도');
                              
                              const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
                              const colorCodesPattern = '(?:PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)';
                              const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
                              // Added K24 support to contract weight extraction
                              const contractRegex = new RegExp(`(?:${colorNamesPattern}\\s*|${colorCodesPattern}\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'i');
                              const contractMatch = line.match(contractRegex);
                              let contractWeightNum = contractMatch ? parseFloat(contractMatch[1]) : 0;
                              if (!contractWeightNum) {
                                const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
                                if (donMatch) contractWeightNum = parseFloat(donMatch[1]);
                              }
                              
                              const hasReleaseExplicit = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
                              const isAtChul = line.includes('@출') && !hasReleaseExplicit;

                              let releaseWeightNum = 0;
                              if (isAtChul) {
                                releaseWeightNum = contractWeightNum;
                              } else if (hasReleaseExplicit) {
                                const releaseMatch = line.match(/@출고\s*(\d+(?:\.\d+)?)(g?)/i);
                                if (releaseMatch) {
                                  const val = parseFloat(releaseMatch[1]);
                                  const isGram = releaseMatch[2].toLowerCase() === 'g';
                                  releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                                }
                              }

                              // K18 Clasp extraction for summary
                              let claspAdjustment = 0;
                              let claspContractWeightNum = 0;
                              let claspReleaseWeightNum = 0;
                              if (isK24 && hasClasp) {
                                const claspIdx = claspSummaryCounter++;
                                claspContractWeightNum = parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0;
                                
                                if (isAtChul) {
                                  claspReleaseWeightNum = claspContractWeightNum;
                                } else {
                                  const claspReleaseMatch = line.match(/K18\s*(\d+(?:\.\d+)?)/i);
                                  if (claspReleaseMatch) {
                                    claspReleaseWeightNum = parseFloat(claspReleaseMatch[1]);
                                  }
                                }
                                
                                const marketPriceK18Cash = parseFloat(marketPrices['K18']?.cash?.replace(/,/g, '') || '0');
                                const claspDiff = claspContractWeightNum - claspReleaseWeightNum;
                                claspAdjustment = Math.round(claspDiff * marketPriceK18Cash);
                              }
                              
                              const itemKey = `line-${idx}`;
                              const currentItem = calcBData[itemKey] || { productPrice: '' };
                              const diffDon = Number((contractWeightNum - releaseWeightNum).toFixed(3));
                              const marketPriceCash = parseFloat(marketPrices[purityKey]?.cash?.replace(/,/g, '') || '0');
                              const mainAdjustment = Math.round(diffDon * marketPriceCash);
                              
                              const isHwansan = purityKey === 'K24' && (line.includes('장식환산') || line.includes('[K18 장식환산]'));
                              const totalAdjustment = (isHwansan || isAtChul) ? 0 : (mainAdjustment + claspAdjustment);
                              const productPriceNum = parseFloat(currentItem.productPrice.replace(/,/g, '')) || 0;
                              const finalPrice = productPriceNum - totalAdjustment;

                              const jewelryCategories = ['반지', '팔찌', '목걸이', '메달', '귀걸이', '체인', '펜던트', '발찌'];
                              let itemName = '제품';
                              for (const cat of jewelryCategories) {
                                if (line.includes(cat)) {
                                  itemName = cat;
                                  break;
                                }
                              }
                              if (itemName === '제품') {
                                const genericMatch = line.match(/[가-힣]{2,}/);
                                if (genericMatch) itemName = genericMatch[0];
                              }

                              return {
                                idx,
                                line,
                                purityKey,
                                isAtChul,
                                contractWeightNum,
                                releaseWeightNum,
                                diffDon,
                                adjustment: totalAdjustment,
                                productPriceNum,
                                finalPrice,
                                itemName,
                                isAddition: totalAdjustment < 0,
                                hasClasp,
                                claspContractWeightNum,
                                claspReleaseWeightNum,
                                claspAdjustment,
                                itemDownPaymentNum: 0
                              };
                            });

                            const totalItemsPrice = items.reduce((sum, item) => sum + item.finalPrice, 0);
                            const downPaymentNum = parseFloat(downPayment.replace(/,/g, '')) || 0;
                            const discountNum = parseFloat(discount.replace(/,/g, '')) || 0;
                            const finalTotal = totalItemsPrice - downPaymentNum - discountNum;

                            // Content for Copy Preview
                            const hasHwansan = items.some(it => it.purityKey === 'K24' && (it.line.includes('장식환산') || it.line.includes('[K18 장식환산]')));
                            const itemsSumFormula = items.map(it => formatNumber(Math.round(it.finalPrice))).join('+');
                            const itemsPartFormula = items.length > 1 ? `(${itemsSumFormula})` : itemsSumFormula;

                            const formulaParts = [];
                            if (hasHwansan) {
                              formulaParts.push(`M${formatNumber(Math.round(totalItemsPrice))}`);
                              if (downPaymentNum > 0) formulaParts.push(`${formatNumber(downPaymentNum)}`);
                              if (discountNum > 0) formulaParts.push(`${formatNumber(discountNum)}(할인)`);
                            } else {
                              formulaParts.push(`${itemsPartFormula}`);
                              if (downPaymentNum > 0) formulaParts.push(`${formatNumber(downPaymentNum)}`);
                              if (discountNum > 0) formulaParts.push(`${formatNumber(discountNum)}(할인)`);
                            }

                            const formattedTotal = Math.round(finalTotal) < 0 
                              ? `M${formatNumber(Math.abs(Math.round(finalTotal)))} 남음 (보관)` 
                              : (downPaymentNum > 0 && finalTotal > 0 ? `잔금 ${formatNumber(Math.round(finalTotal))}` : `M${formatNumber(Math.round(finalTotal))}`);

                            const fullFormula = `${formulaParts.join(' - ')} = ${formattedTotal}`;

                            const copyPreviewText = hasHwansan
                              ? fullFormula
                              : items.filter(it => it.line.includes('@출') || it.hasClasp).map(it => {
                                  if (it.isAtChul) {
                                    // @출 있는 경우 중량만 표기, 0을 빼고 금액만 남김
                                    return `${it.idx + 1}- ${it.itemName} ${it.contractWeightNum}돈\nM${formatNumber(it.finalPrice)}`;
                                  }

                                  const weightDiffLabel = it.diffDon < 0 ? ' 추가' : (it.diffDon > 0 ? ' 차감' : '');
                                  const isK24Equal = it.purityKey === 'K24' && it.diffDon === 0;
                                  const weightInfo = isK24Equal ? '' : ` ${it.contractWeightNum}-${it.releaseWeightNum}=${Math.abs(it.diffDon).toFixed(3)}돈${weightDiffLabel}`;
                                  const claspInfo = it.hasClasp ? ` / ${it.purityKey === 'K24' ? 'K18 ' : ''}장식 ${it.claspContractWeightNum}-${it.claspReleaseWeightNum}=${parseFloat(Math.abs(it.claspContractWeightNum - it.claspReleaseWeightNum).toFixed(3))}돈${it.claspContractWeightNum - it.claspReleaseWeightNum < 0 ? ' 추가' : ''}` : '';
                                  const displayTitle = it.purityKey === 'K24' ? `K24 ${it.contractWeightNum || it.releaseWeightNum}돈 ${it.itemName}` : it.itemName;
                                  const itemFinalPriceStr = it.finalPrice < 0 ? `M${formatNumber(Math.abs(it.finalPrice))} 남음 (보관)` : `M${formatNumber(it.finalPrice)}`;
                                  return `${it.idx + 1}- ${displayTitle}${weightInfo}${claspInfo} ▷ ${formatNumber(Math.abs(it.adjustment))}${it.isAddition ? ' 추가' : ''}\nM${formatNumber(it.productPriceNum)}${it.isAddition ? '+' : '-'}${formatNumber(Math.abs(it.adjustment))}=${itemFinalPriceStr}`;
                                }).join('\n') + (items.length === 1 && downPaymentNum === 0 && discountNum === 0 ? '' : `\n\n` + fullFormula);

                            // Content for SMS Content
                            const formatFullPriceWithWon = (p: number) => formatNumber(Math.round(p)) + ",000원";
                            const formatFullPriceNoWon = (p: number) => formatNumber(Math.round(p)) + ",000";
                            const formatFullPriceWithWonAndStorage = (p: number, itemDP: number = 0) => {
                              const r = Math.round(p);
                              if (r < 0) return formatNumber(Math.abs(r)) + ",000원 남음 (보관)";
                              if (itemDP > 0 && r > 0) return "잔금 " + formatNumber(r) + ",000원";
                              return formatNumber(r) + ",000원";
                            };
                            
                            const smsItemsSumFormula = items.map(it => formatFullPriceNoWon(it.finalPrice)).join('+');
                            const smsItemsPartFormula = items.length > 1 ? `(${smsItemsSumFormula})` : smsItemsSumFormula;
                            
                            const smsParts = [];
                            if (hasHwansan) {
                              smsParts.push(`${formatFullPriceNoWon(totalItemsPrice)}`);
                              if (downPaymentNum > 0) smsParts.push(`${formatFullPriceNoWon(downPaymentNum)}`);
                              if (discountNum > 0) smsParts.push(`${formatFullPriceNoWon(discountNum)}(할인)`);
                            } else {
                              smsParts.push(`${smsItemsPartFormula}`);
                              if (downPaymentNum > 0) smsParts.push(`${formatFullPriceNoWon(downPaymentNum)}`);
                              if (discountNum > 0) smsParts.push(`${formatFullPriceNoWon(discountNum)}(할인)`);
                            }
                            const smsFinalTotalStr = Math.round(finalTotal) < 0
                              ? `${formatFullPriceWithWon(Math.abs(finalTotal))} 남음 (보관)`
                              : (downPaymentNum > 0 && finalTotal > 0 ? `잔금 ${formatFullPriceWithWon(finalTotal)}` : formatFullPriceWithWon(finalTotal));
                            const smsFullFormula = smsParts.join('-') + `=${smsFinalTotalStr}`;

                            const smsContent = `♧칠보당♧\n주문하신 제품이 도착했습니다\n\n` + 
                              (hasHwansan
                                ? `${smsFullFormula}`
                                : items.filter(it => it.line.includes('@출') || it.hasClasp).map(it => {
                                    if (it.isAtChul) {
                                      // @출 있는 경우 중량만 표기, 수식내역 일체 표기 안 함
                                      const gramWeight = (Math.round(it.contractWeightNum * 3.75 * 100) / 100).toFixed(2).replace(/\.00$/, '');
                                      const titleLine = `${it.idx + 1}- 출고 ${it.purityKey} ${it.contractWeightNum}돈 (${gramWeight}g) ${it.itemName}\n`;
                                      const priceLine = `▷ ${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`;
                                      return `${titleLine}${priceLine}`;
                                    }

                                    const weightDiffLabel = it.diffDon < 0 ? ' 추가' : (it.diffDon > 0 ? ' 차감' : '');
                                    const isK24Equal = it.purityKey === 'K24' && it.diffDon === 0;
                                    const k24Weight = it.releaseWeightNum || it.contractWeightNum;
                                    const titleLine = it.purityKey === 'K24'
                                      ? `${it.idx + 1}- 출고 ${it.purityKey} ${k24Weight}돈 ${it.itemName}\n`
                                      : `${it.idx + 1}- 출고 ${it.purityKey} ${it.releaseWeightNum}돈(${Math.round(it.releaseWeightNum * 3.75 * 100) / 100}g) ${it.itemName}\n`;
                                    const subtractionLine = isK24Equal
                                      ? ''
                                      : `${it.contractWeightNum}-${it.releaseWeightNum}=${Math.abs(it.diffDon).toFixed(3)}돈${weightDiffLabel}\n`;
                                    const claspDiff = it.claspContractWeightNum - it.claspReleaseWeightNum;
                                    const claspDiffLabel = claspDiff < 0 ? ' 추가' : (claspDiff > 0 ? ' 차감' : '');
                                    const claspLine = (it.purityKey === 'K24' && it.hasClasp)
                                      ? `K18장식 ${it.claspContractWeightNum}-${it.claspReleaseWeightNum}=${parseFloat(Math.abs(claspDiff).toFixed(3))}돈${claspDiffLabel}\n`
                                      : '';
                                    const priceDetailsLine = it.adjustment !== 0
                                      ? `${formatFullPriceNoWon(it.productPriceNum)}${it.isAddition ? '+' : '-'}${formatFullPriceNoWon(Math.abs(it.adjustment))}=${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`
                                      : `▷ ${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`;
                                    return `${titleLine}${subtractionLine}${claspLine}${priceDetailsLine}`;
                                  }).join('\n\n') + (items.length === 1 && downPaymentNum === 0 && discountNum === 0 ? '' : `\n\n${smsFullFormula}`)
                              ) +
                                `\n\n======\n영업시간 10:00~19:30\n단, 월요일은 19시 마감합니다.\n매주 일요일은 쉽니다\nTel.061-662-9817\nHP.010-8270-9817`;

                            return (
                              <div className="space-y-6">
                                {/* Summary Card - Reduced height and width for compact look */}
                                <div className="p-5 bg-brand-accent dark:bg-brand-accent/20 rounded-[2rem] text-zinc-900 dark:text-zinc-100 border border-brand-accent/50 dark:border-brand-accent/30 shadow-lg max-w-xl mx-auto md:mx-0">
                                  <div className="flex items-center gap-3 mb-3 no-copy">
                                    <Calculator className="w-5 h-5 text-brand-primary dark:text-brand-accent" />
                                    <h3 className="text-base font-black">최종 합산 결과</h3>
                                  </div>
                                  
                                  <div className="space-y-2.5 font-medium opacity-90">
                                    <div className="flex justify-between items-center text-xs border-b border-white/20 pb-2 no-copy">
                                      <span>총 아이템 합계</span>
                                      <span className="font-mono text-sm">M{formatNumber(totalItemsPrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs no-copy">
                                      <span>선금 차감</span>
                                      <span className="font-mono text-brand-accent">- {formatNumber(downPaymentNum)}</span>
                                    </div>
                                    {discountNum > 0 && (
                                      <div className="flex justify-between items-center text-xs no-copy">
                                        <span>할인</span>
                                        <span className="font-mono text-brand-accent">- {formatNumber(discountNum)}</span>
                                      </div>
                                    )}
                                    <div className="pt-2 flex justify-between items-end border-t border-brand-accent/40 no-copy">
                                      <span className="text-brand-accent font-black text-[9px] uppercase tracking-widest">
                                        Final Total
                                      </span>
                                      <div className="text-right">
                                        <p className="text-2xl font-black tracking-tighter">
                                          {finalTotal < 0 ? (
                                            <>M<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.abs(Math.round(finalTotal)))}</span> 남음 (보관)</>
                                          ) : (
                                            <>
                                              {downPaymentNum > 0 && finalTotal > 0 && <span className="text-sm font-bold mr-1">잔금</span>}
                                              M<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.round(finalTotal))}</span>
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-white/10 no-copy" />
                                    <div className="text-left font-mono text-[11px] leading-relaxed">
                                      {fullFormula}
                                    </div>
                                  </div>
                                </div>

                                {/* Copy Preview Section */}
                                <div className="bg-white/40 dark:bg-zinc-800/20 p-6 rounded-[2rem] border border-white/50 dark:border-zinc-700/30 no-copy">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <Copy className="w-4 h-4 text-zinc-400" />
                                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">복사 내용 미리보기</h3>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(copyPreviewText);
                                          setCopiedPreview(true);
                                          setTimeout(() => setCopiedPreview(false), 2000);
                                        } catch (e) { console.error('Copy failed:', e); }
                                      }}
                                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
                                    >
                                      {copiedPreview ? (
                                        <span className="text-brand-primary flex items-center gap-1">
                                          <Check className="w-3 h-3" /> 복사됨!
                                        </span>
                                      ) : (
                                        <>내용 복사</>
                                      )}
                                    </button>
                                  </div>
                                  <div className="bg-white/60 dark:bg-zinc-900/40 p-4 rounded-xl font-mono text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap border border-zinc-100 dark:border-zinc-800 shadow-inner">
                                    {copyPreviewText}
                                  </div>
                                </div>

                                {/* SMS Content Section */}
                                <div className="bg-zinc-900 text-zinc-100 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden no-copy">
                                  <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Smartphone className="w-32 h-32" />
                                  </div>
                                  <div className="flex items-center justify-between mb-6 relative z-10">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="w-5 h-5 text-brand-accent" />
                                      <h3 className="text-lg font-black text-white">문자발송내용</h3>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(smsContent);
                                          setCopiedSMS(true);
                                          setTimeout(() => setCopiedSMS(false), 2000);
                                        } catch (e) { console.error('Copy failed:', e); }
                                      }}
                                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all border border-zinc-700 min-w-[80px]"
                                    >
                                      {copiedSMS ? (
                                        <span className="text-brand-accent flex items-center gap-1">
                                          <Check className="w-3 h-3" /> 복사됨!
                                        </span>
                                      ) : (
                                        <>내용 복사</>
                                      )}
                                    </button>
                                  </div>
                                  <div className="bg-zinc-800/50 p-6 rounded-2xl font-mono text-sm leading-[1.6] text-zinc-300 whitespace-pre-wrap border border-zinc-700/50 relative z-10 shadow-inner">
                                    {smsContent}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                )}

                {activeTab === 'calculationC' && (
                  <div className="space-y-6">
                    {/* Global Market Prices Inputs for Order Calculation C */}
                    <div className="bg-white/40 dark:bg-zinc-800/20 p-4 rounded-2xl border border-white/50 dark:border-zinc-700/30">
                      <div className="grid grid-cols-3 gap-2">
                        {['K18', 'K14', 'K24'].map((p) => {
                          const isK18 = p === 'K18';
                          const isK14 = p === 'K14';
                          const colorClass = isK18 ? 'text-brand-primary' : isK14 ? 'text-rose-600' : 'text-brand-accent';
                          const borderClass = isK18 ? 'border-brand-primary/30 focus:border-brand-primary' : isK14 ? 'border-brand-secondary/30 focus:border-brand-secondary' : 'border-brand-accent/30 focus:border-brand-accent';
                          return (
                            <div key={p} className="space-y-1.5">
                              <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${colorClass}`}>{p} 시세</label>
                              <input
                                type="text"
                                value={marketPrices[p]?.cash || ''}
                                onChange={(e) => setMarketPrices(prev => ({
                                  ...prev,
                                  [p]: { ...prev[p], cash: e.target.value }
                                }))}
                                placeholder={`${p} 시세`}
                                className={`w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border rounded-xl focus:outline-none focus:ring-1 ${borderClass}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual Item Calculations based on 'Order Content' text with per-item 선금 & 할인 */}
                    <div ref={historyResultRef} className="space-y-4">
                      {(() => {
                        let claspCounter = 0;
                        return historyInput.trim() ? (
                          historyInput.split('\n').filter(line => line.trim()).map((line, idx) => {
                            const purityMatch = line.match(/(K14|K18|K24|14K|18K|24K)/i);
                            const purityStr = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
                            const purityKey = `K${purityStr}`;
                            const isK24 = purityKey === 'K24';
                            const hasClasp = line.includes('장식별도');
                            
                            const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
                            const colorCodesPattern = '(?:PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)';
                            const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
                            const contractRegex = new RegExp(`(?:${colorNamesPattern}\\s*|${colorCodesPattern}\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'i');
                            const contractMatch = line.match(contractRegex);
                            let contractWeightNum = contractMatch ? parseFloat(contractMatch[1]) : 0;
                            if (!contractWeightNum) {
                              const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
                              if (donMatch) contractWeightNum = parseFloat(donMatch[1]);
                            }

                            const hasReleaseExplicit = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
                            const isAtChul = line.includes('@출') && !hasReleaseExplicit;

                            let releaseWeightNum = 0;
                            if (isAtChul) {
                              releaseWeightNum = contractWeightNum;
                            } else if (hasReleaseExplicit) {
                              const releaseMatch = line.match(/@출고\s*(\d+(?:\.\d+)?)(g?)/i);
                              if (releaseMatch) {
                                const val = parseFloat(releaseMatch[1]);
                                const isGram = releaseMatch[2].toLowerCase() === 'g';
                                releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                              }
                            }

                            let claspIdx = -1;
                            let claspContractWeightNum = 0;
                            let claspReleaseWeightNum = 0;
                            let claspAdjustment = 0;
                            
                            if (isK24 && hasClasp) {
                              claspIdx = claspCounter++;
                              claspContractWeightNum = parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0;
                              if (isAtChul) {
                                claspReleaseWeightNum = claspContractWeightNum;
                              } else {
                                const claspReleaseMatch = line.match(/K18\s*(\d+(?:\.\d+)?)/i);
                                if (claspReleaseMatch) {
                                  claspReleaseWeightNum = parseFloat(claspReleaseMatch[1]);
                                }
                              }
                              
                              const marketPriceK18Cash = parseFloat(marketPrices['K18']?.cash?.replace(/,/g, '') || '0');
                              const claspDiff = claspContractWeightNum - claspReleaseWeightNum;
                              claspAdjustment = Math.round(claspDiff * marketPriceK18Cash);
                            }

                            const itemKey = `line-${idx}`;
                            const currentItem = calcCData[itemKey] || { productPrice: '', downPayment: '', discount: '' };
                            
                            const diffDon = Number((contractWeightNum - releaseWeightNum).toFixed(3));
                            const marketPriceCash = parseFloat(marketPrices[purityKey]?.cash?.replace(/,/g, '') || '0');

                            const mainAdjustment = Math.round(diffDon * marketPriceCash);
                            
                            const isHwansan = purityKey === 'K24' && (line.includes('장식환산') || line.includes('[K18 장식환산]'));
                            const totalAdjustment = (isHwansan || isAtChul) ? 0 : (mainAdjustment + claspAdjustment);
                            
                            const productPriceNum = parseFloat(currentItem.productPrice.replace(/,/g, '')) || 0;
                            const itemDownPaymentNum = parseFloat(currentItem.downPayment.replace(/,/g, '')) || 0;
                            const itemDiscountNum = parseFloat(currentItem.discount.replace(/,/g, '')) || 0;

                            const adjustedProductPrice = productPriceNum - totalAdjustment;
                            const finalPrice = adjustedProductPrice - itemDownPaymentNum - itemDiscountNum;

                            const isAddition = totalAdjustment < 0;
                            const absAdjustment = Math.abs(totalAdjustment);

                            const jewelryCategories = ['반지', '팔찌', '목걸이', '메달', '귀걸이', '체인', '펜던트', '발찌'];
                            let itemName = '제품';
                            for (const cat of jewelryCategories) {
                              if (line.includes(cat)) {
                                itemName = cat;
                                break;
                              }
                            }
                            if (itemName === '제품') {
                              const genericMatch = line.match(/[가-힣]{2,}/);
                              if (genericMatch) itemName = genericMatch[0];
                            }

                            return (
                              <div key={idx} className="bg-white/60 dark:bg-zinc-800/40 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex-1 min-w-[200px]">
                                    <p className="text-xs text-zinc-400 font-bold mb-1 uppercase tracking-tighter no-copy">{purityKey} Item</p>
                                    <p className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-1 no-copy">{line}</p>
                                  </div>
                                  <div className="flex gap-2 flex-wrap sm:flex-nowrap no-copy">
                                    {isK24 && hasClasp && !isAtChul && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-brand-primary uppercase tracking-widest pl-1">K18장식 계약중량</label>
                                        <input
                                          type="text"
                                          value={claspWeights[claspIdx] || '0'}
                                          onChange={(e) => {
                                            const next = [...claspWeights];
                                            next[claspIdx] = e.target.value;
                                            setClaspWeights(next);
                                          }}
                                          placeholder="장식 계약"
                                          className="w-20 px-2.5 py-1.5 text-xs bg-brand-primary/5 dark:bg-zinc-900 border border-brand-primary/20 rounded-lg focus:ring-1 focus:ring-brand-primary"
                                        />
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">제품가(천원)</label>
                                      <input
                                        type="text"
                                        value={currentItem.productPrice}
                                        onChange={(e) => setCalcCData({
                                          ...calcCData,
                                          [itemKey]: { ...currentItem, productPrice: e.target.value }
                                        })}
                                        placeholder="제품가"
                                        className="w-24 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">선금</label>
                                      <input
                                        type="text"
                                        value={currentItem.downPayment}
                                        onChange={(e) => setCalcCData({
                                          ...calcCData,
                                          [itemKey]: { ...currentItem, downPayment: e.target.value }
                                        })}
                                        placeholder="선금"
                                        className="w-20 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">할인(천원)</label>
                                      <input
                                        type="text"
                                        value={currentItem.discount}
                                        onChange={(e) => setCalcCData({
                                          ...calcCData,
                                          [itemKey]: { ...currentItem, discount: e.target.value }
                                        })}
                                        placeholder="할인"
                                        className="w-20 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {(line.includes('@출') || (isK24 && hasClasp)) && (
                                  <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-3 space-y-2">
                                    {isAtChul ? (
                                      <div className="flex items-start gap-2 no-copy">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5"></div>
                                        <div className="text-sm">
                                          <div>
                                            <span className="font-bold text-brand-primary dark:text-brand-accent">{idx + 1}- {itemName} {contractWeightNum}돈</span>
                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">@출 (계약중량)</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2 no-copy">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5"></div>
                                        <div className="text-sm">
                                          <div>
                                            <span className="font-bold text-brand-primary dark:text-brand-accent">{idx + 1}- {isK24 ? `${purityKey} ${contractWeightNum || releaseWeightNum}돈 ${itemName}` : itemName}</span>{' '}
                                            <span className="font-mono text-zinc-400">
                                              {isHwansan ? (
                                                <>[K18 장식환산]</>
                                              ) : isK24 && diffDon === 0 ? (
                                                null
                                              ) : (
                                                <>{contractWeightNum}-{releaseWeightNum}={Math.abs(diffDon).toFixed(3)}돈{diffDon < 0 ? ' 추가' : ''}</>
                                              )}
                                            </span>
                                            {hasClasp && (
                                              <span className="font-mono text-zinc-400 ml-1">
                                                / K18 장식 {claspContractWeightNum}-{claspReleaseWeightNum}={parseFloat(Math.abs(claspContractWeightNum - claspReleaseWeightNum).toFixed(3))}돈{claspContractWeightNum - claspReleaseWeightNum < 0 ? ' 추가' : ''}
                                              </span>
                                            )}
                                          </div>
                                          {!isHwansan && (
                                            <div className="mt-1 space-y-0.5">
                                              <div className="text-xs">
                                                <span className="inline-flex items-center gap-1">
                                                  <span className="font-bold text-brand-primary dark:text-brand-accent">▷ {formatNumber(absAdjustment)}{isAddition ? ' 추가' : ''}</span>
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 pl-4 no-copy">
                                      <div className="w-2 h-2 border-l-2 border-b-2 border-zinc-200 dark:border-zinc-700"></div>
                                      <span className="text-sm font-bold">
                                        {currentItem.productPrice ? (
                                          isAtChul ? (
                                            <div className="space-y-0.5">
                                              <div>
                                                <span className="text-zinc-400 font-mono">
                                                  M{formatNumber(productPriceNum)}
                                                  {itemDownPaymentNum > 0 ? ` - ${formatNumber(itemDownPaymentNum)}(선금)` : ''}
                                                  {itemDiscountNum > 0 ? ` - ${formatNumber(itemDiscountNum)}(할인)` : ''}
                                                   = {finalPrice < 0 ? `M${formatNumber(Math.abs(finalPrice))} 남음 (보관)` : (itemDownPaymentNum > 0 && finalPrice > 0 ? `잔금 M${formatNumber(finalPrice)}` : `M${formatNumber(finalPrice)}`)}
                                                </span>
                                                <span className="ml-1 text-base tracking-tight text-zinc-900 dark:text-zinc-100 no-copy">
                                                  ({finalPrice < 0 ? <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(Math.abs(finalPrice))}</span> 남음 (보관)</> : (itemDownPaymentNum > 0 && finalPrice > 0 ? <>잔금 M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></> : <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></>)})
                                                </span>
                                              </div>
                                            </div>
                                          ) : isHwansan ? (
                                            <>
                                              <span className="text-zinc-400 font-mono">
                                                M{formatNumber(productPriceNum)}
                                                {itemDownPaymentNum > 0 ? ` - ${formatNumber(itemDownPaymentNum)}(선금)` : ''}
                                                {itemDiscountNum > 0 ? ` - ${formatNumber(itemDiscountNum)}(할인)` : ''}
                                                 = {finalPrice < 0 ? `M${formatNumber(Math.abs(finalPrice))} 남음 (보관)` : (itemDownPaymentNum > 0 && finalPrice > 0 ? `잔금 M${formatNumber(finalPrice)}` : `M${formatNumber(finalPrice)}`)}
                                              </span>
                                              <span className="ml-1 text-lg tracking-tight text-zinc-900 dark:text-zinc-100 no-copy">
                                                ({finalPrice < 0 ? <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(Math.abs(finalPrice))}</span> 남음 (보관)</> : (itemDownPaymentNum > 0 && finalPrice > 0 ? <>잔금 M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></> : <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></>)})
                                              </span>
                                            </>
                                          ) : (
                                            <div className="space-y-0.5">
                                              <div>
                                                <span className="text-zinc-400 font-mono">
                                                  M{formatNumber(productPriceNum)}{isAddition ? '+' : '-'}${formatNumber(absAdjustment)}=M{formatNumber(adjustedProductPrice)}
                                                  {itemDownPaymentNum > 0 ? ` - ${formatNumber(itemDownPaymentNum)}(선금)` : ''}
                                                  {itemDiscountNum > 0 ? ` - ${formatNumber(itemDiscountNum)}(할인)` : ''}
                                                   = {finalPrice < 0 ? `M${formatNumber(Math.abs(finalPrice))} 남음 (보관)` : (itemDownPaymentNum > 0 && finalPrice > 0 ? `잔금 M${formatNumber(finalPrice)}` : `M${formatNumber(finalPrice)}`)}
                                                </span>
                                                <span className="ml-1 text-base tracking-tight text-zinc-900 dark:text-zinc-100 no-copy">
                                                  ({finalPrice < 0 ? <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(Math.abs(finalPrice))}</span> 남음 (보관)</> : (itemDownPaymentNum > 0 && finalPrice > 0 ? <>잔금 M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></> : <>M<span className="text-brand-primary dark:text-white underline decoration-brand-accent/30 underline-offset-4">{formatNumber(finalPrice)}</span></>)})
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        ) : (
                                          <span className="text-zinc-300 italic font-normal no-copy">제품가를 입력하면 최종 정산액이 계산됩니다.</span>
                                        )}
                                      </span>
                                    </div>

                                    {currentItem.productPrice && (
                                      <div className="hidden no-copy-text">
                                        {isHwansan 
                                          ? `M${formatNumber(productPriceNum)}${itemDownPaymentNum > 0 ? ` - ${formatNumber(itemDownPaymentNum)}(선금)` : ''}${itemDiscountNum > 0 ? ` - ${formatNumber(itemDiscountNum)}(할인)` : ''} = ${finalPrice < 0 ? `M${formatNumber(Math.abs(finalPrice))} 남음 (보관)` : `M${formatNumber(finalPrice)}`}` 
                                          : `M${formatNumber(productPriceNum)}${isAddition ? '+' : '-'}${formatNumber(absAdjustment)}=M${formatNumber(adjustedProductPrice)}${itemDownPaymentNum > 0 ? ` - ${formatNumber(itemDownPaymentNum)}(선금)` : ''}${itemDiscountNum > 0 ? ` - ${formatNumber(itemDiscountNum)}(할인)` : ''} = ${finalPrice < 0 ? `M${formatNumber(Math.abs(finalPrice))} 남음 (보관)` : `M${formatNumber(finalPrice)}`}`
                                        }
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <EmptyState />
                        );
                      })()}
                    </div>

                    {/* Final Total Calculation Summary for C */}
                    {historyInput.trim() && (
                      <div className="space-y-6">
                        {(() => {
                          let claspSummaryCounter = 0;
                          const hasCashPriceGlobal = ['K18', 'K14', 'K24'].some(p => {
                            const c = parseFloat(marketPrices[p]?.cash?.replace(/,/g, '') || '0');
                            const n = parseFloat(marketPrices[p]?.normal?.replace(/,/g, '') || '0');
                            return c > 0 && c !== n;
                          });

                          const items = historyInput.split('\n').filter(line => line.trim()).map((line, idx) => {
                            const purityMatch = line.match(/(K14|K18|K24|14K|18K|24K)/i);
                            const purityStr = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
                            const purityKey = `K${purityStr}`;
                            const isK24 = purityKey === 'K24';
                            const hasClasp = line.includes('장식별도');

                            const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
                            const colorCodesPattern = '(?:PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)';
                            const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
                            const contractRegex = new RegExp(`(?:${colorNamesPattern}\\s*|${colorCodesPattern}\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'i');
                            const contractMatch = line.match(contractRegex);
                            let contractWeightNum = contractMatch ? parseFloat(contractMatch[1]) : 0;
                            if (!contractWeightNum) {
                              const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
                              if (donMatch) contractWeightNum = parseFloat(donMatch[1]);
                            }

                            const hasReleaseExplicit = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
                            const isAtChul = line.includes('@출') && !hasReleaseExplicit;

                            let releaseWeightNum = 0;
                            if (isAtChul) {
                              releaseWeightNum = contractWeightNum;
                            } else if (hasReleaseExplicit) {
                              const releaseMatch = line.match(/@출고\s*(\d+(?:\.\d+)?)(g?)/i);
                              if (releaseMatch) {
                                const val = parseFloat(releaseMatch[1]);
                                const isGram = releaseMatch[2].toLowerCase() === 'g';
                                releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                              }
                            }

                            let claspAdjustment = 0;
                            let claspContractWeightNum = 0;
                            let claspReleaseWeightNum = 0;
                            if (isK24 && hasClasp) {
                              const claspIdx = claspSummaryCounter++;
                              claspContractWeightNum = parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0;
                              if (isAtChul) {
                                claspReleaseWeightNum = claspContractWeightNum;
                              } else {
                                const claspReleaseMatch = line.match(/K18\s*(\d+(?:\.\d+)?)/i);
                                if (claspReleaseMatch) {
                                  claspReleaseWeightNum = parseFloat(claspReleaseMatch[1]);
                                }
                              }
                              const marketPriceK18Cash = parseFloat(marketPrices['K18']?.cash?.replace(/,/g, '') || '0');
                              const claspDiff = claspContractWeightNum - claspReleaseWeightNum;
                              claspAdjustment = Math.round(claspDiff * marketPriceK18Cash);
                            }

                            const itemKey = `line-${idx}`;
                            const currentItem = calcCData[itemKey] || { productPrice: '', downPayment: '', discount: '' };
                            const diffDon = Number((contractWeightNum - releaseWeightNum).toFixed(3));
                            const marketPriceCash = parseFloat(marketPrices[purityKey]?.cash?.replace(/,/g, '') || '0');

                            const mainAdjustment = Math.round(diffDon * marketPriceCash);

                            const isHwansan = purityKey === 'K24' && (line.includes('장식환산') || line.includes('[K18 장식환산]'));
                            const totalAdjustment = (isHwansan || isAtChul) ? 0 : (mainAdjustment + claspAdjustment);

                            const productPriceNum = parseFloat(currentItem.productPrice.replace(/,/g, '')) || 0;
                            const itemDownPaymentNum = parseFloat(currentItem.downPayment.replace(/,/g, '')) || 0;
                            const itemDiscountNum = parseFloat(currentItem.discount.replace(/,/g, '')) || 0;

                            const adjustedProductPrice = productPriceNum - totalAdjustment;
                            const finalPrice = adjustedProductPrice - itemDownPaymentNum - itemDiscountNum;

                            const jewelryCategories = ['반지', '팔찌', '목걸이', '메달', '귀걸이', '체인', '펜던트', '발찌'];
                            let itemName = '제품';
                            for (const cat of jewelryCategories) {
                              if (line.includes(cat)) {
                                itemName = cat;
                                break;
                              }
                            }
                            if (itemName === '제품') {
                              const genericMatch = line.match(/[가-힣]{2,}/);
                              if (genericMatch) itemName = genericMatch[0];
                            }

                            return { 
                              idx, line, purityKey, isAtChul, contractWeightNum, releaseWeightNum, diffDon, 
                              adjustment: totalAdjustment,
                              productPriceNum, itemDownPaymentNum, itemDiscountNum, 
                              adjustedProductPrice, finalPrice, 
                              itemName, 
                              isAddition: totalAdjustment < 0, 
                              hasClasp, claspContractWeightNum, claspReleaseWeightNum, 
                              claspAdjustment 
                            };
                          });

                          const totalProductPrice = items.reduce((sum, item) => sum + item.productPriceNum, 0);
                          const totalDownPayments = items.reduce((sum, item) => sum + item.itemDownPaymentNum, 0);
                          const totalDiscounts = items.reduce((sum, item) => sum + item.itemDiscountNum, 0);
                          const grandTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);

                          const formatFormulaStr = (finalPrices: number[], finalT: number) => {
                            const itemsSumStr = finalPrices.map(p => formatNumber(Math.round(p))).join('+');
                            const itemsPart = finalPrices.length > 1 ? `(${itemsSumStr})` : itemsSumStr;
                            const formattedTotal = Math.round(finalT) < 0
                              ? `M${formatNumber(Math.abs(Math.round(finalT)))} 남음 (보관)`
                              : (totalDownPayments > 0 && finalT > 0 ? `잔금 ${formatNumber(Math.round(finalT))}` : `M${formatNumber(Math.round(finalT))}`);
                            return `${itemsPart} = ${formattedTotal}`;
                          };

                          const fullFormula = formatFormulaStr(items.map(it => it.finalPrice), grandTotal);

                          const copyPreviewText = items.filter(it => it.line.includes('@출') || it.hasClasp).map(it => {
                            if (it.isAtChul) {
                              return `${it.idx + 1}- ${it.itemName} ${it.contractWeightNum}돈\nM${formatNumber(it.finalPriceNormal)}`;
                            }

                            const weightDiffLabel = it.diffDon < 0 ? ' 추가' : (it.diffDon > 0 ? ' 차감' : '');
                            const isK24Equal = it.purityKey === 'K24' && it.diffDon === 0;
                            const weightInfo = isK24Equal ? '' : ` ${it.contractWeightNum}-${it.releaseWeightNum}=${Math.abs(it.diffDon).toFixed(3)}돈${weightDiffLabel}`;
                            const claspInfo = it.hasClasp ? ` / ${it.purityKey === 'K24' ? 'K18 ' : ''}장식 ${it.claspContractWeightNum}-${it.claspReleaseWeightNum}=${parseFloat(Math.abs(it.claspContractWeightNum - it.claspReleaseWeightNum).toFixed(3))}돈${it.claspContractWeightNum - it.claspReleaseWeightNum < 0 ? ' 추가' : ''}` : '';
                            const downStr = it.itemDownPaymentNum > 0 ? ` - ${formatNumber(it.itemDownPaymentNum)}(선금)` : '';
                            const discStr = it.itemDiscountNum > 0 ? ` - ${formatNumber(it.itemDiscountNum)}(할인)` : '';
                            const displayTitle = it.purityKey === 'K24' ? `K24 ${it.contractWeightNum || it.releaseWeightNum}돈 ${it.itemName}` : it.itemName;
                            const itemFinalStr = it.finalPrice < 0 ? `M${formatNumber(Math.abs(it.finalPrice))} 남음 (보관)` : (it.itemDownPaymentNum > 0 && it.finalPrice > 0 ? `잔금 M${formatNumber(it.finalPrice)}` : `M${formatNumber(it.finalPrice)}`);

                            return `${it.idx + 1}- ${displayTitle}${weightInfo}${claspInfo} ▷ ${formatNumber(Math.abs(it.adjustment))}${it.isAddition ? ' 추가' : ''}\nM${formatNumber(it.productPriceNum)}${it.isAddition ? '+' : '-'}${formatNumber(Math.abs(it.adjustment))}=M${formatNumber(it.adjustedProductPrice)}${downStr}${discStr} = ${itemFinalStr}`;
                          }).join('\n') + (items.length > 1 ? `\n\n` + fullFormula : '');

                          const formatFullPriceWithWon = (p: number) => formatNumber(Math.round(p)) + ",000원";
                          const formatFullPriceNoWon = (p: number) => formatNumber(Math.round(p)) + ",000";
                          const formatFullPriceWithWonAndStorage = (p: number, itemDP: number = 0) => { const r = Math.round(p); if (r < 0) return formatNumber(Math.abs(r)) + ",000원 남음 (보관)"; if (itemDP > 0 && r > 0) return "잔금 " + formatNumber(r) + ",000원"; return formatNumber(r) + ",000원"; };

                          const smsContent = `♧칠보당♧\n주문하신 제품이 도착했습니다\n\n` + 
                            items.filter(it => it.line.includes('@출') || it.hasClasp).map(it => {
                              if (it.isAtChul) {
                                const gramWeight = (Math.round(it.contractWeightNum * 3.75 * 100) / 100).toFixed(2).replace(/\.00$/, '');
                                const titleLine = `${it.idx + 1}- 출고 ${it.purityKey} ${it.contractWeightNum}돈 (${gramWeight}g) ${it.itemName}\n`;
                                const priceLine = `▷ ${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`;
                                return `${titleLine}${priceLine}`;
                              }

                              const weightDiffLabel = it.diffDon < 0 ? ' 추가' : (it.diffDon > 0 ? ' 차감' : '');
                              const isK24Equal = it.purityKey === 'K24' && it.diffDon === 0;
                              const k24Weight = it.releaseWeightNum || it.contractWeightNum;
                              const titleLine = it.purityKey === 'K24'
                                ? `${it.idx + 1}- 출고 ${it.purityKey} ${k24Weight}돈 ${it.itemName}\n`
                                : `${it.idx + 1}- 출고 ${it.purityKey} ${it.releaseWeightNum}돈(${Math.round(it.releaseWeightNum * 3.75 * 100) / 100}g) ${it.itemName}\n`;
                              const subtractionLine = isK24Equal
                                ? ''
                                : `${it.contractWeightNum}-${it.releaseWeightNum}=${Math.abs(it.diffDon).toFixed(3)}돈${weightDiffLabel}\n`;
                              const claspDiff = it.claspContractWeightNum - it.claspReleaseWeightNum;
                              const claspDiffLabel = claspDiff < 0 ? ' 추가' : (claspDiff > 0 ? ' 차감' : '');
                              const claspLine = (it.purityKey === 'K24' && it.hasClasp)
                                ? `K18장식 ${it.claspContractWeightNum}-${it.claspReleaseWeightNum}=${parseFloat(Math.abs(claspDiff).toFixed(3))}돈${claspDiffLabel}\n`
                                : '';
                                
                              const downStr = it.itemDownPaymentNum > 0 ? `-${formatFullPriceNoWon(it.itemDownPaymentNum)}(선금)` : '';
                              const discStr = it.itemDiscountNum > 0 ? `-${formatFullPriceNoWon(it.itemDiscountNum)}(할인)` : '';
                              
                              let priceDetailsLine = '';
                              if (it.adjustment !== 0) {
                                priceDetailsLine = `${formatFullPriceNoWon(it.productPriceNum)}${it.isAddition ? '+' : '-'}${formatFullPriceNoWon(Math.abs(it.adjustment))}=${formatFullPriceNoWon(it.adjustedProductPrice)}${downStr}${discStr}=${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`;
                              } else {
                                if (it.itemDownPaymentNum > 0 || it.itemDiscountNum > 0) {
                                  priceDetailsLine = `${formatFullPriceNoWon(it.productPriceNum)}${downStr}${discStr}=${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`;
                                } else {
                                  priceDetailsLine = `▷ ${formatFullPriceWithWonAndStorage(it.finalPrice, it.itemDownPaymentNum)}`;
                                }
                              }
                              return `${titleLine}${subtractionLine}${claspLine}${priceDetailsLine}`;
                            }).join('\n\n') + (items.length > 1 ? `\n\n(${items.map(it => formatFullPriceNoWon(it.finalPrice)).join('+')})=${Math.round(grandTotal) < 0 ? `${formatFullPriceWithWon(Math.abs(grandTotal))} 남음 (보관)` : (totalDownPayments > 0 && grandTotal > 0 ? `잔금 ${formatFullPriceWithWon(grandTotal)}` : formatFullPriceWithWon(grandTotal))}` : '') +
                             `\n\n======\n영업시간 10:00~19:30\n단, 월요일은 19시 마감합니다.\n매주 일요일은 쉽니다\nTel.061-662-9817\nHP.010-8270-9817`;

                          return (
                            <div className="space-y-6">
                              <div className="p-5 bg-brand-accent dark:bg-brand-accent/20 rounded-[2rem] text-zinc-900 dark:text-zinc-100 border border-brand-accent/50 dark:border-brand-accent/30 shadow-lg max-w-xl mx-auto md:mx-0">
                                <div className="flex items-center gap-3 mb-3 no-copy">
                                  <Calculator className="w-5 h-5 text-brand-primary dark:text-brand-accent" />
                                  <h3 className="text-base font-black">최종 합산 결과 (개별 선금/할인 반영)</h3>
                                </div>
                                
                                <div className="space-y-2.5 font-medium opacity-90">
                                  <div className="flex justify-between items-center text-xs border-b border-white/20 pb-2 no-copy">
                                    <span>총 제품가 합계</span>
                                    <span className="font-mono text-sm">M{formatNumber(totalProductPrice)}</span>
                                  </div>
                                  {totalDownPayments > 0 && (
                                    <div className="flex justify-between items-center text-xs no-copy">
                                      <span>총 선금 차감</span>
                                      <span className="font-mono text-brand-accent">- {formatNumber(totalDownPayments)}</span>
                                    </div>
                                  )}
                                  {totalDiscounts > 0 && (
                                    <div className="flex justify-between items-center text-xs no-copy">
                                      <span>총 할인 차감</span>
                                      <span className="font-mono text-brand-accent">- {formatNumber(totalDiscounts)}</span>
                                    </div>
                                  )}
                                  <div className="pt-2 flex justify-between items-end border-t border-brand-accent/40 no-copy">
                                    <span className="text-brand-accent font-black text-[9px] uppercase tracking-widest">Final Total</span>
                                    <div className="text-right">
                                      <p className="text-2xl font-black tracking-tighter">
                                        {grandTotal < 0 ? (
                                          <>M<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.abs(Math.round(grandTotal)))}</span> 남음 (보관)</>
                                        ) : totalDownPayments > 0 && grandTotal > 0 ? (
                                          <>잔금 M<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.round(grandTotal))}</span></>
                                        ) : (
                                          <>M<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.round(grandTotal))}</span></>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white/40 dark:bg-zinc-800/20 p-6 rounded-[2rem] border border-white/50 dark:border-zinc-700/30 no-copy">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">복사 내용 미리보기</h3>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(copyPreviewText);
                                        setCopiedPreview(true);
                                        setTimeout(() => setCopiedPreview(false), 2000);
                                      } catch (e) { console.error('Copy failed:', e); }
                                    }}
                                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
                                  >
                                    {copiedPreview ? (
                                      <span className="text-brand-primary flex items-center gap-1">
                                        <Check className="w-3 h-3" /> 복사됨!
                                      </span>
                                    ) : (
                                      <>내용 복사</>
                                    )}
                                  </button>
                                </div>
                                <div className="bg-white/60 dark:bg-zinc-900/40 p-4 rounded-xl font-mono text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap border border-zinc-100 dark:border-zinc-800 shadow-inner">
                                  {copyPreviewText}
                                </div>
                              </div>

                              <div className="bg-zinc-900 text-zinc-100 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden no-copy">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                  <Smartphone className="w-32 h-32" />
                                </div>
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-brand-accent" />
                                    <h3 className="text-lg font-black text-white">문자발송내용</h3>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(smsContent);
                                        setCopiedSMS(true);
                                        setTimeout(() => setCopiedSMS(false), 2000);
                                      } catch (e) { console.error('Copy failed:', e); }
                                    }}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all border border-zinc-700 min-w-[80px]"
                                  >
                                    {copiedSMS ? (
                                      <span className="text-brand-accent flex items-center gap-1">
                                        <Check className="w-3 h-3" /> 복사됨!
                                      </span>
                                    ) : (
                                      <>내용 복사</>
                                    )}
                                  </button>
                                </div>
                                <div className="bg-zinc-800/50 p-6 rounded-2xl font-mono text-sm leading-[1.6] text-zinc-300 whitespace-pre-wrap border border-zinc-700/50 relative z-10 shadow-inner">
                                  {smsContent}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'calculationD' && (
                  <div className="space-y-6">
                    {/* Global Inputs for Order Calculation D: 선금/할인 1배 폭, 정상가/현금가 시세 2배 폭 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/40 dark:bg-zinc-800/20 p-4 rounded-2xl border border-white/50 dark:border-zinc-700/30">
                      {/* 선금, 할인 입력란: 1열 차지 */}
                      <div className="md:col-span-1 grid grid-cols-2 gap-2 bg-white/70 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">선금</label>
                          <input
                            type="text"
                            value={downPayment}
                            onChange={(e) => setDownPayment(e.target.value)}
                            placeholder="선금"
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">할인(천원)</label>
                          <input
                            type="text"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            placeholder="할인"
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                          />
                        </div>
                      </div>

                      {/* 정상가, 현금가 시세 입력란: 2열 차지 (가로폭 2배) */}
                      <div className="md:col-span-2 grid grid-cols-3 gap-2">
                        {['K18', 'K14', 'K24'].map((p) => {
                          const currentPrices = marketPrices[p] || { normal: '', cash: '' };
                          const isK18 = p === 'K18';
                          const isK14 = p === 'K14';
                          const colorClass = isK18 ? 'text-brand-primary' : isK14 ? 'text-rose-600' : 'text-brand-accent';
                          return (
                            <div key={p} className="bg-white/70 dark:bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className={`text-xs font-black uppercase tracking-wider ${colorClass}`}>{p} 시세</label>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5 block mb-0.5">정상가</span>
                                  <input
                                    type="text"
                                    value={currentPrices.normal}
                                    onChange={(e) => setMarketPrices({
                                      ...marketPrices,
                                      [p]: { ...currentPrices, normal: e.target.value }
                                    })}
                                    placeholder="정상가"
                                    className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-0.5 block mb-0.5">현금가</span>
                                  <input
                                    type="text"
                                    value={currentPrices.cash}
                                    onChange={(e) => setMarketPrices({
                                      ...marketPrices,
                                      [p]: { ...currentPrices, cash: e.target.value }
                                    })}
                                    placeholder="현금가"
                                    className="w-full px-2 py-1 text-xs bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-emerald-700 dark:text-emerald-300"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual Item Calculations for Order Calculation D */}
                    <div ref={historyResultRef} className="space-y-4">
                      {(() => {
                        let claspCounter = 0;
                        if (!historyInput.trim()) return null;

                        const rawLines = historyInput.split('\n').map(l => l.trim()).filter(Boolean);

                        const isPureAtChulHeader = (l: string) => {
                          const clean = l.replace(/^\s*(?:[#\d]+[\.\)\-:#\s]*|\[\d+\]\s*|[-*·•]\s*)?/, '').trim();
                          if (!(/^@출(?![고가-힣a-zA-Z0-9])/.test(clean) || clean === '@출' || /^@출\s/.test(clean))) return false;
                          const hasPurity = /(K14|K18|K24|14K|18K|24K)/i.test(l);
                          const hasWeight = /(\d+(?:\.\d+)?)\s*(돈|g)/i.test(l);
                          const hasColor = /(?:골드|핑크|화이트|무도금화이트|옐로우|로즈|PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)\s*(\d+(?:\.\d+)?)/i.test(l);
                          return !hasPurity && !hasWeight && !hasColor;
                        };

                        const lines = (rawLines.length > 0 && isPureAtChulHeader(rawLines[0]))
                          ? rawLines.slice(1)
                          : rawLines;

                        const globalDP = parseFloat(downPayment.replace(/,/g, '')) || 0;
                        const globalDisc = parseFloat(discount.replace(/,/g, '')) || 0;

                        return lines.map((line, idx) => {
                          const purityMatch = line.match(/(K14|K18|K24|14K|18K|24K)/i);
                          const purityStr = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
                          const purityKey = `K${purityStr}`;
                          const isK24 = purityKey === 'K24';
                          const hasClasp = line.includes('장식별도');
                          
                          // 시작 텍스트가 @출 일 때만 계약중량 적용 (@출고는 제외)
                          const cleanPrefix = line.replace(/^\s*(?:[#\d]+[\.\)\-:#\s]*|\[\d+\]\s*|[-*·•]\s*)?/, '').trim();
                          const startsWithAtChul = /^@출(?![고가-힣a-zA-Z0-9])/.test(cleanPrefix) || cleanPrefix === '@출' || /^@출\s/.test(cleanPrefix);
                          const hasExplicitRelease = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
                          const isAtChul = startsWithAtChul && !hasExplicitRelease;
                          const hasTextRelease = hasExplicitRelease || /(?:출고|완성|실제)\s*(\d+(?:\.\d+)?)\s*(돈|g)/i.test(line);

                          const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
                          const colorCodesPattern = '(?:PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)';
                          const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
                          const contractRegex = new RegExp(`(?:${colorNamesPattern}\\s*|${colorCodesPattern}\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'i');
                          const contractMatch = line.match(contractRegex);
                          let contractWeightNum = contractMatch ? parseFloat(contractMatch[1]) : 0;
                          if (contractWeightNum === 0) {
                            const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
                            if (donMatch) contractWeightNum = parseFloat(donMatch[1]);
                          }

                          const releaseWeight = calcDData[`line-${idx}`]?.releaseWeight !== undefined 
                            ? calcDData[`line-${idx}`].releaseWeight 
                            : '';
                          let releaseWeightNum = 0;
                          if (isAtChul) {
                            releaseWeightNum = contractWeightNum;
                          } else {
                            // @출고 6.98g 또는 @출고 1.86돈 우선 매칭
                            const atReleaseMatch = line.match(/@출고\s*(\d+(?:\.\d+)?)\s*(돈|g)?/i);
                            if (atReleaseMatch) {
                              const val = parseFloat(atReleaseMatch[1]);
                              const isGram = atReleaseMatch[2]?.toLowerCase() === 'g';
                              releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                            } else {
                              const explicitMatch = line.match(/(?:출고|완성|실제)\s*(\d+(?:\.\d+)?)\s*(돈|g)/i);
                              if (explicitMatch) {
                                const val = parseFloat(explicitMatch[1]);
                                const isGram = explicitMatch[2].toLowerCase() === 'g';
                                releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                              } else if (releaseWeight) {
                                releaseWeightNum = parseFloat(releaseWeight.replace(/,/g, '')) || 0;
                              }
                            }
                          }

                          let claspIdx = -1;
                          let claspContractWeightNum = 0;
                          let claspReleaseWeightNum = 0;
                          let claspAdjustmentNormal = 0;
                          let claspAdjustmentCash = 0;
                            
                            if (isK24 && hasClasp) {
                              claspIdx = claspCounter++;
                              claspContractWeightNum = parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0;
                              if (isAtChul) {
                                claspReleaseWeightNum = claspContractWeightNum;
                              } else {
                                const claspReleaseMatch = line.match(/K18\s*(\d+(?:\.\d+)?)/i);
                                if (claspReleaseMatch) {
                                  claspReleaseWeightNum = parseFloat(claspReleaseMatch[1]);
                                }
                              }
                              
                              const marketPriceK18Normal = parseFloat(marketPrices['K18']?.normal?.replace(/,/g, '') || '0');
                              const marketPriceK18Cash = parseFloat(marketPrices['K18']?.cash?.replace(/,/g, '') || '0');
                              const claspDiff = claspContractWeightNum - claspReleaseWeightNum;
                              claspAdjustmentNormal = Math.round(claspDiff * (marketPriceK18Normal > 0 ? marketPriceK18Normal : marketPriceK18Cash));
                              claspAdjustmentCash = Math.round(claspDiff * (marketPriceK18Cash > 0 ? marketPriceK18Cash : (marketPriceK18Normal > 0 ? marketPriceK18Normal : 0)));
                            }

                            const itemKey = `line-${idx}`;
                            const currentItem = calcDData[itemKey] || { releaseWeight: '', productPrice: '', downPayment: '', discount: '' };
                            
                            const diffDon = Number((contractWeightNum - releaseWeightNum).toFixed(3));
                            const marketPriceNormal = parseFloat(marketPrices[purityKey]?.normal?.replace(/,/g, '') || '0');
                            const marketPriceCash = parseFloat(marketPrices[purityKey]?.cash?.replace(/,/g, '') || '0');
                            const effectiveNormal = marketPriceNormal > 0 ? marketPriceNormal : marketPriceCash;
                            const effectiveCash = marketPriceCash > 0 ? marketPriceCash : marketPriceNormal;
                            const hasCashPrice = marketPriceCash > 0 && marketPriceNormal > 0 && marketPriceCash !== marketPriceNormal;

                            const mainAdjustmentNormal = Math.round(diffDon * effectiveNormal);
                            const mainAdjustmentCash = Math.round(diffDon * effectiveCash);
                            
                            const isHwansan = purityKey === 'K24' && (line.includes('장식환산') || line.includes('[K18 장식환산]'));
                            const totalAdjustmentNormal = (isHwansan || isAtChul) ? 0 : (mainAdjustmentNormal + claspAdjustmentNormal);
                            const totalAdjustmentCash = (isHwansan || isAtChul) ? 0 : (mainAdjustmentCash + claspAdjustmentCash);
                            
                            const productPriceNormalStr = currentItem.productPriceNormal !== undefined 
                              ? currentItem.productPriceNormal 
                              : (currentItem.productPrice || '');
                            const productPriceCashStr = currentItem.productPriceCash !== undefined 
                              ? currentItem.productPriceCash 
                              : '';

                            const productPriceNormalNum = parseFloat(productPriceNormalStr.replace(/,/g, '')) || 0;
                            const productPriceCashNum = productPriceCashStr 
                              ? (parseFloat(productPriceCashStr.replace(/,/g, '')) || 0) 
                              : productPriceNormalNum;

                            const itemDownPaymentNum = parseFloat(currentItem.downPayment.replace(/,/g, '')) || 0;
                            const itemDiscountNum = parseFloat(currentItem.discount.replace(/,/g, '')) || 0;
                            const effectiveDownPaymentNum = itemDownPaymentNum > 0 ? itemDownPaymentNum : (lines.length === 1 ? globalDP : 0);
                            const effectiveDiscountNum = itemDiscountNum > 0 ? itemDiscountNum : (lines.length === 1 ? globalDisc : 0);

                            const adjustedProductPriceNormal = productPriceNormalNum - totalAdjustmentNormal;
                            const finalPriceNormal = adjustedProductPriceNormal - effectiveDownPaymentNum - effectiveDiscountNum;
                            const adjustedProductPriceCash = productPriceCashNum - totalAdjustmentCash;
                            const finalPriceCash = adjustedProductPriceCash - effectiveDownPaymentNum - effectiveDiscountNum;

                            const hasAnyProductPrice = productPriceNormalNum > 0 || (parseFloat(productPriceCashStr.replace(/,/g, '')) || 0) > 0;

                            const isAdditionNormal = totalAdjustmentNormal < 0;
                            const isAdditionCash = totalAdjustmentCash < 0;
                            const absAdjustmentNormal = Math.abs(totalAdjustmentNormal);
                            const absAdjustmentCash = Math.abs(totalAdjustmentCash);

                            const jewelryCategories = ['반지', '팔찌', '목걸이', '메달', '귀걸이', '체인', '펜던트', '발찌'];
                            let itemName = '제품';
                            for (const cat of jewelryCategories) {
                              if (line.includes(cat)) {
                                itemName = cat;
                                break;
                              }
                            }
                            if (itemName === '제품') {
                              const genericMatch = line.match(/[가-힣]{2,}/);
                              if (genericMatch) itemName = genericMatch[0];
                            }

                            return (
                              <div key={idx} className="bg-white/60 dark:bg-zinc-800/40 p-4 rounded-2xl border border-white/80 dark:border-zinc-700/50 shadow-sm space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black bg-brand-primary/10 dark:bg-brand-accent/20 text-brand-primary dark:text-brand-accent px-2 py-0.5 rounded-md">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                                      {line}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!isAtChul && !hasTextRelease && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">출고중량</label>
                                        <input
                                          type="text"
                                          value={releaseWeight}
                                          onChange={(e) => setCalcDData({
                                            ...calcDData,
                                            [itemKey]: { ...currentItem, releaseWeight: e.target.value }
                                          })}
                                          placeholder="출고중량"
                                          className="w-20 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary font-mono"
                                        />
                                      </div>
                                    )}
                                    {isK24 && hasClasp && !isAtChul && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-brand-primary uppercase tracking-widest pl-1">K18장식 계약중량</label>
                                        <input
                                          type="text"
                                          value={claspWeights[claspIdx] || '0'}
                                          onChange={(e) => {
                                            const next = [...claspWeights];
                                            next[claspIdx] = e.target.value;
                                            setClaspWeights(next);
                                          }}
                                          placeholder="장식 계약"
                                          className="w-20 px-2 py-1.5 text-xs bg-brand-primary/5 dark:bg-zinc-900 border border-brand-primary/20 rounded-lg focus:ring-1 focus:ring-brand-primary font-mono"
                                        />
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">정상 제품가(천원)</label>
                                      <input
                                        type="text"
                                        value={currentItem.productPriceNormal ?? currentItem.productPrice ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setCalcDData({
                                            ...calcDData,
                                            [itemKey]: { 
                                              ...currentItem, 
                                              productPriceNormal: val,
                                              productPrice: val
                                            }
                                          });
                                        }}
                                        placeholder="정상가"
                                        className="w-24 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary font-mono font-medium"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-1">현금 제품가(천원)</label>
                                      <input
                                        type="text"
                                        value={currentItem.productPriceCash ?? ''}
                                        onChange={(e) => setCalcDData({
                                          ...calcDData,
                                          [itemKey]: { 
                                            ...currentItem, 
                                            productPriceCash: e.target.value 
                                          }
                                        })}
                                        placeholder="현금가"
                                        className="w-24 px-2 py-1.5 text-xs bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono font-medium text-emerald-700 dark:text-emerald-300"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">선금</label>
                                      <input
                                        type="text"
                                        value={currentItem.downPayment}
                                        onChange={(e) => setCalcDData({
                                          ...calcDData,
                                          [itemKey]: { ...currentItem, downPayment: e.target.value }
                                        })}
                                        placeholder="선금"
                                        className="w-16 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">할인(천원)</label>
                                      <input
                                        type="text"
                                        value={currentItem.discount}
                                        onChange={(e) => setCalcDData({
                                          ...calcDData,
                                          [itemKey]: { ...currentItem, discount: e.target.value }
                                        })}
                                        placeholder="할인"
                                        className="w-16 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-brand-primary font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Calculation Breakdown - Always Shown for Each Item */}
                                <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-3 space-y-2.5">
                                  {/* Title and Weight Breakdown */}
                                  <div className="flex items-start justify-between gap-2 no-copy">
                                    <div className="text-sm">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-brand-primary dark:text-brand-accent">
                                          {idx + 1}- {isK24 ? `${purityKey} ${contractWeightNum || releaseWeightNum}돈 ${itemName}` : itemName}
                                        </span>
                                        {isAtChul ? (
                                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                                            @출 (계약중량 {contractWeightNum}돈 적용)
                                          </span>
                                        ) : (
                                          <span className="font-mono text-zinc-500 text-xs">
                                            {diffDon < 0 ? (
                                              <>{contractWeightNum} - {releaseWeightNum} = {Math.abs(diffDon).toFixed(3)}돈 추가</>
                                            ) : diffDon > 0 ? (
                                              <>{contractWeightNum} - {releaseWeightNum} = {Math.abs(diffDon).toFixed(3)}돈 차감</>
                                            ) : isK24 ? null : (
                                              <>{contractWeightNum}돈 (중량 변동없음)</>
                                            )}
                                            {hasClasp && (
                                              <span className="text-zinc-400 ml-1">
                                                / K18 장식 {claspContractWeightNum} - {claspReleaseWeightNum} = {parseFloat(Math.abs(claspContractWeightNum - claspReleaseWeightNum).toFixed(3))}돈{claspContractWeightNum - claspReleaseWeightNum < 0 ? ' 추가' : (claspContractWeightNum - claspReleaseWeightNum > 0 ? ' 차감' : '')}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      {!isHwansan && !isAtChul && (
                                        <div className="mt-1 flex items-center gap-4 text-xs">
                                          <span className="inline-flex items-center gap-1">
                                            <span className="font-bold text-zinc-500">▷ 정상가 정산:</span>
                                            <span className="font-bold text-brand-primary dark:text-brand-accent">
                                              {formatNumber(absAdjustmentNormal)}{isAdditionNormal ? ' 추가' : (totalAdjustmentNormal > 0 ? ' 차감' : '')}
                                            </span>
                                          </span>
                                          <span className="inline-flex items-center gap-1">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">▷ 현금가 정산:</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                              {formatNumber(absAdjustmentCash)}{isAdditionCash ? ' 추가' : (totalAdjustmentCash > 0 ? ' 차감' : '')}
                                            </span>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Dual Price Calculation Breakdown Box */}
                                  <div className="bg-zinc-50/80 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 space-y-2 no-copy">
                                    {/* 정상가 내역 */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-brand-primary/10 text-brand-primary dark:bg-brand-accent/20 dark:text-brand-accent whitespace-nowrap">
                                          [정상가]
                                        </span>
                                        {productPriceNormalNum > 0 ? (
                                          <span className="font-mono text-zinc-600 dark:text-zinc-300">
                                            C{formatNumber(productPriceNormalNum)}
                                            {!isAtChul && totalAdjustmentNormal !== 0 ? (
                                              (effectiveDownPaymentNum > 0 || effectiveDiscountNum > 0) ? (
                                                <>
                                                  {isAdditionNormal ? '+' : '-'}{formatNumber(absAdjustmentNormal)}
                                                  {effectiveDownPaymentNum > 0 && <>-{formatNumber(effectiveDownPaymentNum)}(선금)</>}
                                                  {effectiveDiscountNum > 0 && <>-{formatNumber(effectiveDiscountNum)}(할인)</>}
                                                  {' ='}C{formatNumber(adjustedProductPriceNormal)}
                                                  {effectiveDownPaymentNum > 0 && <>-{formatNumber(effectiveDownPaymentNum)}(선금)</>}
                                                  {effectiveDiscountNum > 0 && <>-{formatNumber(effectiveDiscountNum)}(할인)</>}
                                                </>
                                              ) : (
                                                <>{isAdditionNormal ? '+' : '-'}{formatNumber(absAdjustmentNormal)} =C{formatNumber(adjustedProductPriceNormal)}</>
                                              )
                                            ) : (
                                              (effectiveDownPaymentNum > 0 || effectiveDiscountNum > 0) ? (
                                                <>
                                                  {effectiveDownPaymentNum > 0 && <>-{formatNumber(effectiveDownPaymentNum)}(선금)</>}
                                                  {effectiveDiscountNum > 0 && <>-{formatNumber(effectiveDiscountNum)}(할인)</>}
                                                </>
                                              ) : null
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-400 italic text-[11px]">
                                            정상 제품가 미입력 {!isAtChul && totalAdjustmentNormal !== 0 ? `(시세 정산: ${formatNumber(absAdjustmentNormal)} ${isAdditionNormal ? '추가' : '차감'})` : ''}
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-bold">
                                        {productPriceNormalNum > 0 ? (
                                          finalPriceNormal < 0 ? (
                                            <span className="text-brand-primary dark:text-white">C{formatNumber(Math.abs(finalPriceNormal))} 남음 (보관)</span>
                                          ) : effectiveDownPaymentNum > 0 && finalPriceNormal > 0 ? (
                                            <span className="text-brand-primary dark:text-white">잔금 C{formatNumber(finalPriceNormal)}</span>
                                          ) : (
                                            <span className="text-brand-primary dark:text-white">C{formatNumber(finalPriceNormal)}</span>
                                          )
                                        ) : (
                                          <span className="text-zinc-400 font-mono text-[11px]">-</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* 현금가 내역 */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 whitespace-nowrap">
                                          [현금가]
                                        </span>
                                        {productPriceCashNum > 0 ? (
                                          <span className="font-mono text-emerald-800 dark:text-emerald-300">
                                            M{formatNumber(productPriceCashNum)}
                                            {!isAtChul && totalAdjustmentCash !== 0 ? (
                                              (effectiveDownPaymentNum > 0 || effectiveDiscountNum > 0) ? (
                                                <>
                                                  {isAdditionCash ? '+' : '-'}{formatNumber(absAdjustmentCash)}
                                                  {effectiveDownPaymentNum > 0 && <>-{formatNumber(effectiveDownPaymentNum)}(선금)</>}
                                                  {effectiveDiscountNum > 0 && <>-{formatNumber(effectiveDiscountNum)}(할인)</>}
                                                  {' ='}M{formatNumber(adjustedProductPriceCash)}
                                                  {effectiveDownPaymentNum > 0 && <>-{formatNumber(effectiveDownPaymentNum)}(선금)</>}
                                                  {effectiveDiscountNum > 0 && <>-{formatNumber(effectiveDiscountNum)}(할인)</>}
                                                </>
                                              ) : (
                                                <>{isAdditionCash ? '+' : '-'}{formatNumber(absAdjustmentCash)} =M{formatNumber(adjustedProductPriceCash)}</>
                                              )
                                            ) : (
                                              (effectiveDownPaymentNum > 0 || effectiveDiscountNum > 0) ? (
                                                <>
                                                  {effectiveDownPaymentNum > 0 && <>-{formatNumber(effectiveDownPaymentNum)}(선금)</>}
                                                  {effectiveDiscountNum > 0 && <>-{formatNumber(effectiveDiscountNum)}(할인)</>}
                                                </>
                                              ) : null
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-400 italic text-[11px]">
                                            현금 제품가 미입력 {!isAtChul && totalAdjustmentCash !== 0 ? `(시세 정산: ${formatNumber(absAdjustmentCash)} ${isAdditionCash ? '추가' : '차감'})` : ''}
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-bold">
                                        {productPriceCashNum > 0 ? (
                                          finalPriceCash < 0 ? (
                                            <span className="text-emerald-700 dark:text-emerald-400">M{formatNumber(Math.abs(finalPriceCash))} 남음 (보관)</span>
                                          ) : effectiveDownPaymentNum > 0 && finalPriceCash > 0 ? (
                                            <span className="text-emerald-700 dark:text-emerald-400">잔금 M{formatNumber(finalPriceCash)}</span>
                                          ) : (
                                            <span className="text-emerald-700 dark:text-emerald-400">M{formatNumber(finalPriceCash)}</span>
                                          )
                                        ) : (
                                          <span className="text-zinc-400 font-mono text-[11px]">-</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                    {/* Summary and Copy / SMS generation for Order Calculation D */}
                    {historyInput.trim() && (
                      <div className="space-y-6">
                        {(() => {
                          const rawLines = historyInput.split('\n').map(l => l.trim()).filter(Boolean);

                          const isPureAtChulHeader = (l: string) => {
                            const clean = l.replace(/^\s*(?:[#\d]+[\.\)\-:#\s]*|\[\d+\]\s*|[-*·•]\s*)?/, '').trim();
                            if (!(/^@출(?![고가-힣a-zA-Z0-9])/.test(clean) || clean === '@출' || /^@출\s/.test(clean))) return false;
                            const hasPurity = /(K14|K18|K24|14K|18K|24K)/i.test(l);
                            const hasWeight = /(\d+(?:\.\d+)?)\s*(돈|g)/i.test(l);
                            const hasColor = /(?:골드|핑크|화이트|무도금화이트|옐로우|로즈|PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)\s*(\d+(?:\.\d+)?)/i.test(l);
                            return !hasPurity && !hasWeight && !hasColor;
                          };

                          const lines = (rawLines.length > 0 && isPureAtChulHeader(rawLines[0]))
                            ? rawLines.slice(1)
                            : rawLines;

                          let claspCounter = 0;
                          const globalDP = parseFloat(downPayment.replace(/,/g, '')) || 0;
                          const globalDisc = parseFloat(discount.replace(/,/g, '')) || 0;
                          const hasCashPriceGlobal = ['K18', 'K14', 'K24'].some(p => {
                            const n = parseFloat(marketPrices[p]?.normal?.replace(/,/g, '') || '0');
                            const c = parseFloat(marketPrices[p]?.cash?.replace(/,/g, '') || '0');
                            return c > 0 && n > 0 && c !== n;
                          });

                          const items = lines.map((line, idx) => {
                            const purityMatch = line.match(/(K14|K18|K24|14K|18K|24K)/i);
                            const purityStr = purityMatch ? purityMatch[1].toUpperCase().replace('K', '') : '18';
                            const purityKey = `K${purityStr}`;
                            const isK24 = purityKey === 'K24';
                            const hasClasp = line.includes('장식별도');
                            
                            // 시작 텍스트가 @출 일 때만 계약중량 적용 (@출고는 제외)
                            const cleanPrefix = line.replace(/^\s*(?:[#\d]+[\.\)\-:#\s]*|\[\d+\]\s*|[-*·•]\s*)?/, '').trim();
                            const startsWithAtChul = /^@출(?![고가-힣a-zA-Z0-9])/.test(cleanPrefix) || cleanPrefix === '@출' || /^@출\s/.test(cleanPrefix);
                            const hasExplicitRelease = /@출고\s*(\d+(?:\.\d+)?)(g?)/i.test(line);
                            const isAtChul = startsWithAtChul && !hasExplicitRelease;

                            const colorNames = ['골드', '핑크', '화이트', '무도금화이트', '옐로우', '로즈'];
                            const colorCodesPattern = '(?:PNW|GNW|PG|GP|GW|PW|WG|WP|NW|G|P|W|Y|R)';
                            const colorNamesPattern = `(?:(?:${colorNames.join('|')})(?:\\+(?:${colorNames.join('|')}))*)`;
                            const contractRegex = new RegExp(`(?:${colorNamesPattern}\\s*|${colorCodesPattern}\\s+|K24\\s+)(\\d+(?:\\.\\d+)?)`, 'i');
                            const contractMatch = line.match(contractRegex);
                            let contractWeightNum = contractMatch ? parseFloat(contractMatch[1]) : 0;
                            if (contractWeightNum === 0) {
                              const donMatch = line.match(/(\d+(?:\.\d+)?)\s*돈/i);
                              if (donMatch) contractWeightNum = parseFloat(donMatch[1]);
                            }

                            const releaseWeight = calcDData[`line-${idx}`]?.releaseWeight !== undefined 
                              ? calcDData[`line-${idx}`].releaseWeight 
                              : '';
                            let releaseWeightNum = 0;
                            if (isAtChul) {
                              releaseWeightNum = contractWeightNum;
                            } else {
                              // @출고 6.98g 또는 @출고 1.86돈 우선 매칭
                              const atReleaseMatch = line.match(/@출고\s*(\d+(?:\.\d+)?)\s*(돈|g)?/i);
                              if (atReleaseMatch) {
                                const val = parseFloat(atReleaseMatch[1]);
                                const isGram = atReleaseMatch[2]?.toLowerCase() === 'g';
                                releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                              } else {
                                const explicitMatch = line.match(/(?:출고|완성|실제)\s*(\d+(?:\.\d+)?)\s*(돈|g)/i);
                                if (explicitMatch) {
                                  const val = parseFloat(explicitMatch[1]);
                                  const isGram = explicitMatch[2].toLowerCase() === 'g';
                                  releaseWeightNum = isGram ? Math.round((val / 3.75) * 1000) / 1000 : val;
                                } else if (releaseWeight) {
                                  releaseWeightNum = parseFloat(releaseWeight.replace(/,/g, '')) || 0;
                                }
                              }
                            }

                            let claspContractWeightNum = 0;
                            let claspReleaseWeightNum = 0;
                            let claspAdjustmentNormal = 0;
                            let claspAdjustmentCash = 0;
                            
                            if (isK24 && hasClasp) {
                              const claspIdx = claspCounter++;
                              claspContractWeightNum = parseFloat(claspWeights[claspIdx]?.replace(/,/g, '')) || 0;
                              if (isAtChul) {
                                claspReleaseWeightNum = claspContractWeightNum;
                              } else {
                                const claspReleaseMatch = line.match(/K18\s*(\d+(?:\.\d+)?)/i);
                                if (claspReleaseMatch) {
                                  claspReleaseWeightNum = parseFloat(claspReleaseMatch[1]);
                                }
                              }
                              const marketPriceK18Normal = parseFloat(marketPrices['K18']?.normal?.replace(/,/g, '') || '0');
                              const marketPriceK18Cash = parseFloat(marketPrices['K18']?.cash?.replace(/,/g, '') || '0');
                              const claspDiff = claspContractWeightNum - claspReleaseWeightNum;
                              claspAdjustmentNormal = Math.round(claspDiff * (marketPriceK18Normal > 0 ? marketPriceK18Normal : marketPriceK18Cash));
                              claspAdjustmentCash = Math.round(claspDiff * (marketPriceK18Cash > 0 ? marketPriceK18Cash : (marketPriceK18Normal > 0 ? marketPriceK18Normal : 0)));
                            }

                            const itemKey = `line-${idx}`;
                            const currentItem = calcDData[itemKey] || { releaseWeight: '', productPrice: '', downPayment: '', discount: '' };
                            const diffDon = Number((contractWeightNum - releaseWeightNum).toFixed(3));
                            const marketPriceNormal = parseFloat(marketPrices[purityKey]?.normal?.replace(/,/g, '') || '0');
                            const marketPriceCash = parseFloat(marketPrices[purityKey]?.cash?.replace(/,/g, '') || '0');
                            const effectiveNormal = marketPriceNormal > 0 ? marketPriceNormal : marketPriceCash;
                            const effectiveCash = marketPriceCash > 0 ? marketPriceCash : marketPriceNormal;

                            const mainAdjustmentNormal = Math.round(diffDon * effectiveNormal);
                            const mainAdjustmentCash = Math.round(diffDon * effectiveCash);

                            const isHwansan = purityKey === 'K24' && (line.includes('장식환산') || line.includes('[K18 장식환산]'));
                            const totalAdjustmentNormal = (isHwansan || isAtChul) ? 0 : (mainAdjustmentNormal + claspAdjustmentNormal);
                            const totalAdjustmentCash = (isHwansan || isAtChul) ? 0 : (mainAdjustmentCash + claspAdjustmentCash);

                            const productPriceNormalStr = currentItem.productPriceNormal !== undefined 
                              ? currentItem.productPriceNormal 
                              : (currentItem.productPrice || '');
                            const productPriceCashStr = currentItem.productPriceCash !== undefined 
                              ? currentItem.productPriceCash 
                              : '';

                            const productPriceNormalNum = parseFloat(productPriceNormalStr.replace(/,/g, '')) || 0;
                            const productPriceCashNum = productPriceCashStr 
                              ? (parseFloat(productPriceCashStr.replace(/,/g, '')) || 0) 
                              : productPriceNormalNum;

                            const itemDownPaymentNum = parseFloat(currentItem.downPayment.replace(/,/g, '')) || 0;
                            const itemDiscountNum = parseFloat(currentItem.discount.replace(/,/g, '')) || 0;
                            const effectiveDownPaymentNum = itemDownPaymentNum > 0 ? itemDownPaymentNum : (lines.length === 1 ? globalDP : 0);
                            const effectiveDiscountNum = itemDiscountNum > 0 ? itemDiscountNum : (lines.length === 1 ? globalDisc : 0);

                            const adjustedProductPriceNormal = productPriceNormalNum - totalAdjustmentNormal;
                            const finalPriceNormal = adjustedProductPriceNormal - effectiveDownPaymentNum - effectiveDiscountNum;
                            const adjustedProductPriceCash = productPriceCashNum - totalAdjustmentCash;
                            const finalPriceCash = adjustedProductPriceCash - effectiveDownPaymentNum - effectiveDiscountNum;

                            const jewelryCategories = ['반지', '팔찌', '목걸이', '메달', '귀걸이', '체인', '펜던트', '발찌'];
                            let itemName = '제품';
                            for (const cat of jewelryCategories) {
                              if (line.includes(cat)) {
                                itemName = cat;
                                break;
                              }
                            }
                            if (itemName === '제품') {
                              const genericMatch = line.match(/[가-힣]{2,}/);
                              if (genericMatch) itemName = genericMatch[0];
                            }

                            return { 
                              idx, line, purityKey, isAtChul, contractWeightNum, releaseWeightNum, diffDon, 
                              adjustmentNormal: totalAdjustmentNormal,
                              adjustmentCash: totalAdjustmentCash,
                              productPriceNormalNum, productPriceCashNum,
                              productPriceNum: productPriceNormalNum,
                              itemDownPaymentNum, itemDiscountNum, 
                              effectiveDownPaymentNum, effectiveDiscountNum,
                              adjustedProductPriceNormal, finalPriceNormal, 
                              adjustedProductPriceCash, finalPriceCash, 
                              itemName, 
                              isAdditionNormal: totalAdjustmentNormal < 0,
                              isAdditionCash: totalAdjustmentCash < 0,
                              hasClasp, claspContractWeightNum, claspReleaseWeightNum, 
                              claspAdjustmentNormal, claspAdjustmentCash 
                            };
                          });

                          const totalProductPriceNormal = items.reduce((sum, item) => sum + item.productPriceNormalNum, 0);
                          const totalProductPriceCash = items.reduce((sum, item) => sum + item.productPriceCashNum, 0);
                          const totalItemDownPayments = items.reduce((sum, item) => sum + item.effectiveDownPaymentNum, 0);
                          const totalItemDiscounts = items.reduce((sum, item) => sum + item.effectiveDiscountNum, 0);
                          const totalDownPayments = totalItemDownPayments > 0 ? totalItemDownPayments : globalDP;
                          const totalDiscounts = totalItemDiscounts > 0 ? totalItemDiscounts : globalDisc;
                          
                          // If global downpayment/discount was entered but no per-item downpayment
                          const grandTotalNormal = totalItemDownPayments === 0 && totalItemDiscounts === 0
                            ? items.reduce((sum, item) => sum + item.adjustedProductPriceNormal, 0) - globalDP - globalDisc
                            : items.reduce((sum, item) => sum + item.finalPriceNormal, 0);
                          const grandTotalCash = totalItemDownPayments === 0 && totalItemDiscounts === 0
                            ? items.reduce((sum, item) => sum + item.adjustedProductPriceCash, 0) - globalDP - globalDisc
                            : items.reduce((sum, item) => sum + item.finalPriceCash, 0);

                          const formatFormulaStr = (isCash: boolean = false, prefix: string = '') => {
                            const finalPrices = isCash ? items.map(it => it.finalPriceCash) : items.map(it => it.finalPriceNormal);
                            const adjustedPrices = isCash ? items.map(it => it.adjustedProductPriceCash) : items.map(it => it.adjustedProductPriceNormal);
                            const finalT = isCash ? grandTotalCash : grandTotalNormal;
                            const currSymbol = isCash ? 'M' : 'C';
                            const formattedTotal = Math.round(finalT) < 0
                              ? `${currSymbol}${formatNumber(Math.abs(Math.round(finalT)))} 남음 (보관)`
                              : (totalDownPayments > 0 && finalT > 0 ? `잔금 ${currSymbol}${formatNumber(Math.round(finalT))}` : `${currSymbol}${formatNumber(Math.round(finalT))}`);

                            if (totalItemDownPayments === 0 && (globalDP > 0 || globalDisc > 0)) {
                              const adjSumStr = adjustedPrices.map(p => formatNumber(Math.round(p))).join('+');
                              const itemsPart = adjustedPrices.length > 1 ? `(${adjSumStr})` : adjSumStr;
                              const dpStr = globalDP > 0 ? ` - ${formatNumber(globalDP)}(선금)` : '';
                              const discStr = globalDisc > 0 ? ` - ${formatNumber(globalDisc)}(할인)` : '';
                              return `${prefix}${itemsPart}${dpStr}${discStr} = ${formattedTotal}`;
                            } else {
                              const itemsSumStr = finalPrices.map(p => formatNumber(Math.round(p))).join('+');
                              const itemsPart = finalPrices.length > 1 ? `(${itemsSumStr})` : itemsSumStr;
                              return `${prefix}${itemsPart} = ${formattedTotal}`;
                            }
                          };

                          const fullFormulaNormal = formatFormulaStr(false, 'C ');
                          const fullFormulaCash = formatFormulaStr(true, 'M ');

                          const buildPreviewFormula = (
                            prefix: string,
                            priceNum: number,
                            adjustment: number,
                            adjustedPrice: number,
                            finalPrice: number,
                            downNum: number,
                            discNum: number,
                            isAtChul: boolean
                          ) => {
                            const downStr = downNum > 0 ? `-${formatNumber(downNum)}(선금)` : '';
                            const discStr = discNum > 0 ? `-${formatNumber(discNum)}(할인)` : '';
                            const finalStr = finalPrice < 0
                              ? `${prefix}${formatNumber(Math.abs(finalPrice))} 남음 (보관)`
                              : (downNum > 0 && finalPrice > 0 ? `잔금 ${prefix}${formatNumber(finalPrice)}` : `${prefix}${formatNumber(finalPrice)}`);

                            if (isAtChul || adjustment === 0) {
                              if (downNum > 0 || discNum > 0) {
                                return `${prefix}${formatNumber(priceNum)}${downStr}${discStr}=${finalStr}`;
                              }
                              return `${prefix}${formatNumber(finalPrice)}`;
                            }

                            const isAddition = adjustment < 0;
                            const adjSign = isAddition ? '+' : '-';
                            const adjStr = `${adjSign}${formatNumber(Math.abs(adjustment))}`;

                            if (downNum > 0 || discNum > 0) {
                              return `${prefix}${formatNumber(priceNum)}${adjStr}${downStr}${discStr} =${prefix}${formatNumber(adjustedPrice)}${downStr}${discStr}=${finalStr}`;
                            }
                            return `${prefix}${formatNumber(priceNum)}${adjStr}=${prefix}${formatNumber(adjustedPrice)}`;
                          };

                          const copyPreviewText = items.map(it => {
                            const normalFormula = buildPreviewFormula('C', it.productPriceNormalNum, it.adjustmentNormal, it.adjustedProductPriceNormal, it.finalPriceNormal, it.effectiveDownPaymentNum, it.effectiveDiscountNum, it.isAtChul);
                            const cashFormula = buildPreviewFormula('M', it.productPriceCashNum, it.adjustmentCash, it.adjustedProductPriceCash, it.finalPriceCash, it.effectiveDownPaymentNum, it.effectiveDiscountNum, it.isAtChul);

                            if (it.isAtChul) {
                              return `${it.idx + 1}- ${it.itemName} ${it.contractWeightNum}돈\n${normalFormula}\n${cashFormula}`;
                            }

                            const weightDiffLabel = it.diffDon < 0 ? ' 추가' : (it.diffDon > 0 ? ' 차감' : '');
                            const isK24Equal = it.purityKey === 'K24' && it.diffDon === 0;
                            const weightInfo = isK24Equal ? '' : ` ${it.contractWeightNum}-${it.releaseWeightNum}=${Math.abs(it.diffDon).toFixed(3)}돈${weightDiffLabel}`;
                            const claspInfo = it.hasClasp ? ` / ${it.purityKey === 'K24' ? 'K18 ' : ''}장식 ${it.claspContractWeightNum}-${it.claspReleaseWeightNum}=${parseFloat(Math.abs(it.claspContractWeightNum - it.claspReleaseWeightNum).toFixed(3))}돈${it.claspContractWeightNum - it.claspReleaseWeightNum < 0 ? ' 추가' : (it.claspContractWeightNum - it.claspReleaseWeightNum > 0 ? ' 차감' : '')}` : '';
                            const displayTitle = it.purityKey === 'K24' ? `K24 ${it.contractWeightNum || it.releaseWeightNum}돈 ${it.itemName}` : it.itemName;

                            return `${it.idx + 1}- ${displayTitle}${weightInfo}${claspInfo} ▷ 정상 ${formatNumber(Math.abs(it.adjustmentNormal))}${it.isAdditionNormal ? ' 추가' : ''} / 현금 ${formatNumber(Math.abs(it.adjustmentCash))}${it.isAdditionCash ? ' 추가' : ''}\n${normalFormula}\n${cashFormula}`;
                          }).join('\n') + (items.length > 1 ? `\n\n` + fullFormulaNormal + `\n` + fullFormulaCash : '');

                          const formatFullPriceWithWon = (p: number) => formatNumber(Math.round(p)) + ",000원";
                          const formatFullPriceNoWon = (p: number) => formatNumber(Math.round(p)) + ",000";
                          const formatFullPriceWithWonAndStorage = (p: number, itemDP: number = 0) => {
                            const r = Math.round(p);
                            if (r < 0) return formatNumber(Math.abs(r)) + ",000원 남음 (보관)";
                            if (itemDP > 0 && r > 0) return "잔금 " + formatNumber(r) + ",000원";
                            return formatNumber(r) + ",000원";
                          };

                          const buildSmsPriceDetail = (
                            label: string,
                            priceNum: number,
                            adjustment: number,
                            adjustedPrice: number,
                            finalPrice: number,
                            downNum: number,
                            discNum: number,
                            isAtChul: boolean
                          ) => {
                            const downNoTag = downNum > 0 ? `-${formatFullPriceNoWon(downNum)}` : '';
                            const discNoTag = discNum > 0 ? `-${formatFullPriceNoWon(discNum)}` : '';
                            const downWithTag = downNum > 0 ? `-${formatFullPriceNoWon(downNum)}(선금)` : '';
                            const discWithTag = discNum > 0 ? `-${formatFullPriceNoWon(discNum)}(할인)` : '';
                            const finalStr = formatFullPriceWithWonAndStorage(finalPrice, downNum);

                            if (isAtChul || adjustment === 0) {
                              if (downNum > 0 || discNum > 0) {
                                return `▷ ${label}: ${formatFullPriceNoWon(priceNum)}${downWithTag}${discWithTag}=${finalStr}`;
                              }
                              return `▷ ${label}: ${formatFullPriceWithWon(finalPrice)}`;
                            }

                            const isAddition = adjustment < 0;
                            const adjSign = isAddition ? '+' : '-';
                            const adjStr = `${adjSign}${formatFullPriceNoWon(Math.abs(adjustment))}`;

                            if (downNum > 0 || discNum > 0) {
                              return `▷ ${label}: ${formatFullPriceNoWon(priceNum)}${adjStr}${downNoTag}${discNoTag}=${formatFullPriceNoWon(adjustedPrice)}${downWithTag}${discWithTag}=${finalStr}`;
                            }
                            return `▷ ${label}: ${formatFullPriceNoWon(priceNum)}${adjStr}=${formatFullPriceWithWon(adjustedPrice)}`;
                          };

                          const smsContent = `♧칠보당♧\n주문하신 제품이 도착했습니다\n\n` + 
                            items.map(it => {
                              if (it.isAtChul) {
                                const gramWeight = (Math.round(it.contractWeightNum * 3.75 * 100) / 100).toFixed(2).replace(/\.00$/, '');
                                const titleLine = `${it.idx + 1}- 출고 ${it.purityKey} ${it.contractWeightNum}돈 (${gramWeight}g) ${it.itemName}\n`;
                                const priceLineNormal = buildSmsPriceDetail('정상가', it.productPriceNormalNum, 0, it.adjustedProductPriceNormal, it.finalPriceNormal, it.effectiveDownPaymentNum, it.effectiveDiscountNum, true);
                                const priceLineCash = buildSmsPriceDetail('현금가', it.productPriceCashNum, 0, it.adjustedProductPriceCash, it.finalPriceCash, it.effectiveDownPaymentNum, it.effectiveDiscountNum, true);
                                return `${titleLine}${priceLineNormal}\n${priceLineCash}`;
                              }

                              const weightDiffLabel = it.diffDon < 0 ? ' 추가' : (it.diffDon > 0 ? ' 차감' : '');
                              const isK24Equal = it.purityKey === 'K24' && it.diffDon === 0;
                              const k24Weight = it.releaseWeightNum || it.contractWeightNum;
                              const titleLine = it.purityKey === 'K24'
                                ? `${it.idx + 1}- 출고 ${it.purityKey} ${k24Weight}돈 ${it.itemName}\n`
                                : `${it.idx + 1}- 출고 ${it.purityKey} ${it.releaseWeightNum}돈(${Math.round(it.releaseWeightNum * 3.75 * 100) / 100}g) ${it.itemName}\n`;
                              const subtractionLine = isK24Equal
                                ? ''
                                : `${it.contractWeightNum}-${it.releaseWeightNum}=${Math.abs(it.diffDon).toFixed(3)}돈${weightDiffLabel}\n`;
                              const claspDiff = it.claspContractWeightNum - it.claspReleaseWeightNum;
                              const claspDiffLabel = claspDiff < 0 ? ' 추가' : (claspDiff > 0 ? ' 차감' : '');
                              const claspLine = (it.purityKey === 'K24' && it.hasClasp)
                                ? `K18장식 ${it.claspContractWeightNum}-${it.claspReleaseWeightNum}=${parseFloat(Math.abs(claspDiff).toFixed(3))}돈${claspDiffLabel}\n`
                                : '';
                                
                              const priceLineNormal = buildSmsPriceDetail('정상가', it.productPriceNormalNum, it.adjustmentNormal, it.adjustedProductPriceNormal, it.finalPriceNormal, it.effectiveDownPaymentNum, it.effectiveDiscountNum, false);
                              const priceLineCash = buildSmsPriceDetail('현금가', it.productPriceCashNum, it.adjustmentCash, it.adjustedProductPriceCash, it.finalPriceCash, it.effectiveDownPaymentNum, it.effectiveDiscountNum, false);

                              return `${titleLine}${subtractionLine}${claspLine}${priceLineNormal}\n${priceLineCash}`;
                            }).join('\n\n') + 
                            (items.length > 1 ? (() => {
                              const formattedTotalNormal = Math.round(grandTotalNormal) < 0 
                                ? `${formatFullPriceWithWon(Math.abs(grandTotalNormal))} 남음 (보관)` 
                                : (totalDownPayments > 0 && grandTotalNormal > 0 ? `잔금 ${formatFullPriceWithWon(grandTotalNormal)}` : formatFullPriceWithWon(grandTotalNormal));
                              const formattedTotalCash = Math.round(grandTotalCash) < 0 
                                ? `${formatFullPriceWithWon(Math.abs(grandTotalCash))} 남음 (보관)` 
                                : (totalDownPayments > 0 && grandTotalCash > 0 ? `잔금 ${formatFullPriceWithWon(grandTotalCash)}` : formatFullPriceWithWon(grandTotalCash));

                              if (totalItemDownPayments === 0 && (globalDP > 0 || globalDisc > 0)) {
                                const normalAdjList = items.map(it => formatFullPriceNoWon(it.adjustedProductPriceNormal)).join('+');
                                const cashAdjList = items.map(it => formatFullPriceNoWon(it.adjustedProductPriceCash)).join('+');
                                const dpStr = globalDP > 0 ? `-${formatFullPriceNoWon(globalDP)}(선금)` : '';
                                const discStr = globalDisc > 0 ? `-${formatFullPriceNoWon(globalDisc)}(할인)` : '';
                                return `\n\n[정상가] (${normalAdjList})${dpStr}${discStr}=${formattedTotalNormal}\n[현금가] (${cashAdjList})${dpStr}${discStr}=${formattedTotalCash}`;
                              } else {
                                const normalList = items.map(it => formatFullPriceNoWon(it.finalPriceNormal)).join('+');
                                const cashList = items.map(it => formatFullPriceNoWon(it.finalPriceCash)).join('+');
                                return `\n\n[정상가] (${normalList})=${formattedTotalNormal}\n[현금가] (${cashList})=${formattedTotalCash}`;
                              }
                            })() : '') +
                            `\n\n======\n영업시간 10:00~19:30\n단, 월요일은 19시 마감합니다.\n매주 일요일은 쉽니다\nTel.061-662-9817\nHP.010-8270-9817`;

                          return (
                            <div className="space-y-6">
                              <div className="p-5 bg-brand-accent dark:bg-brand-accent/20 rounded-[2rem] text-zinc-900 dark:text-zinc-100 border border-brand-accent/50 dark:border-brand-accent/30 shadow-lg max-w-xl mx-auto md:mx-0">
                                <div className="flex items-center gap-3 mb-3 no-copy">
                                  <Calculator className="w-5 h-5 text-brand-primary dark:text-brand-accent" />
                                  <h3 className="text-base font-black">최종 합산 결과 (정상가 / 현금가)</h3>
                                </div>
                                
                                <div className="space-y-2.5 font-medium opacity-90">
                                  <div className="flex justify-between items-center text-xs border-b border-white/20 pb-2 no-copy">
                                    <span>총 정상 제품가</span>
                                    <span className="font-mono text-sm">C{formatNumber(totalProductPriceNormal)}</span>
                                  </div>
                                  {totalProductPriceCash !== totalProductPriceNormal && (
                                    <div className="flex justify-between items-center text-xs border-b border-white/20 pb-2 no-copy text-emerald-800 dark:text-emerald-300">
                                      <span>총 현금 제품가</span>
                                      <span className="font-mono text-sm">M{formatNumber(totalProductPriceCash)}</span>
                                    </div>
                                  )}
                                  {totalDownPayments > 0 && (
                                    <div className="flex justify-between items-center text-xs no-copy">
                                      <span>총 선금 차감</span>
                                      <span className="font-mono text-brand-accent">- {formatNumber(totalDownPayments)}</span>
                                    </div>
                                  )}
                                  {totalDiscounts > 0 && (
                                    <div className="flex justify-between items-center text-xs no-copy">
                                      <span>총 할인 차감</span>
                                      <span className="font-mono text-brand-accent">- {formatNumber(totalDiscounts)}</span>
                                    </div>
                                  )}
                                  <div className="pt-2 flex justify-between items-end border-t border-brand-accent/40 no-copy">
                                    <span className="text-brand-accent font-black text-[9px] uppercase tracking-widest">정상가 Final Total</span>
                                    <div className="text-right">
                                      <p className="text-2xl font-black tracking-tighter">
                                        {grandTotalNormal < 0 ? (
                                          <>C<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.abs(Math.round(grandTotalNormal)))}</span> 남음 (보관)</>
                                        ) : totalDownPayments > 0 && grandTotalNormal > 0 ? (
                                          <>잔금 C<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.round(grandTotalNormal))}</span></>
                                        ) : (
                                          <>C<span className="underline decoration-brand-accent decoration-2 underline-offset-4">{formatNumber(Math.round(grandTotalNormal))}</span></>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="pt-2 flex justify-between items-end border-t border-emerald-500/40 no-copy">
                                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-widest">현금가 Final Total</span>
                                    <div className="text-right">
                                      <p className="text-2xl font-black tracking-tighter text-emerald-800 dark:text-emerald-300">
                                        {grandTotalCash < 0 ? (
                                          <>M<span className="underline decoration-emerald-500 decoration-2 underline-offset-4">{formatNumber(Math.abs(Math.round(grandTotalCash)))}</span> 남음 (보관)</>
                                        ) : totalDownPayments > 0 && grandTotalCash > 0 ? (
                                          <>잔금 M<span className="underline decoration-emerald-500 decoration-2 underline-offset-4">{formatNumber(Math.round(grandTotalCash))}</span></>
                                        ) : (
                                          <>M<span className="underline decoration-emerald-500 decoration-2 underline-offset-4">{formatNumber(Math.round(grandTotalCash))}</span></>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white/40 dark:bg-zinc-800/20 p-6 rounded-[2rem] border border-white/50 dark:border-zinc-700/30 no-copy">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">복사 내용 미리보기</h3>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(copyPreviewText);
                                        setCopiedPreview(true);
                                        setTimeout(() => setCopiedPreview(false), 2000);
                                      } catch (e) { console.error('Copy failed:', e); }
                                    }}
                                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
                                  >
                                    {copiedPreview ? (
                                      <span className="text-brand-primary flex items-center gap-1">
                                        <Check className="w-3 h-3" /> 복사됨!
                                      </span>
                                    ) : (
                                      <>내용 복사</>
                                    )}
                                  </button>
                                </div>
                                <div className="bg-white/60 dark:bg-zinc-900/40 p-4 rounded-xl font-mono text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap border border-zinc-100 dark:border-zinc-800 shadow-inner">
                                  {copyPreviewText}
                                </div>
                              </div>

                              <div className="bg-zinc-900 text-zinc-100 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden no-copy">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                  <Smartphone className="w-32 h-32" />
                                </div>
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-brand-accent" />
                                    <h3 className="text-lg font-black text-white">문자발송내용</h3>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(smsContent);
                                        setCopiedSMS(true);
                                        setTimeout(() => setCopiedSMS(false), 2000);
                                      } catch (e) { console.error('Copy failed:', e); }
                                    }}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all border border-zinc-700 min-w-[80px]"
                                  >
                                    {copiedSMS ? (
                                      <span className="text-brand-accent flex items-center gap-1">
                                        <Check className="w-3 h-3" /> 복사됨!
                                      </span>
                                    ) : (
                                      <>내용 복사</>
                                    )}
                                  </button>
                                </div>
                                <div className="bg-zinc-800/50 p-6 rounded-2xl font-mono text-sm leading-[1.6] text-zinc-300 whitespace-pre-wrap border border-zinc-700/50 relative z-10 shadow-inner">
                                  {smsContent}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'historyResult' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">계약가</label>
                          <input
                            type="text"
                            value={contractPrice}
                            onChange={(e) => setContractPrice(e.target.value)}
                            placeholder="계약가"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">선금</label>
                          <input
                            type="text"
                            value={downPayment}
                            onChange={(e) => setDownPayment(e.target.value)}
                            placeholder="선금"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {['K18', 'K14', 'K24'].map((p) => (
                          <div key={p} className="space-y-1.5">
                            <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${
                              p === 'K18' ? 'text-brand-primary' :
                              p === 'K14' ? 'text-rose-600' :
                              'text-brand-accent'
                            }`}>{p} 시세</label>
                            <input
                              type="text"
                              value={marketPrices[p]?.cash || ''}
                              onChange={(e) => setMarketPrices(prev => ({
                                ...prev,
                                [p]: { ...prev[p], cash: e.target.value }
                              }))}
                              placeholder={`${p} 시세`}
                              className={`w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${
                                p === 'K18' ? 'border-brand-primary/30 text-brand-primary' :
                                p === 'K14' ? 'border-brand-secondary/30 text-brand-secondary dark:text-zinc-300' :
                                'border-brand-accent/30 text-brand-accent'
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      {claspWeights.length > 0 && (
                        <div className="space-y-4">
                          {claspWeights.map((weight, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-brand-accent' : 'text-brand-primary opacity-60'}`}>
                                {claspWeights.length > 1 ? `계약장식중량 ${idx + 1} (K18)` : '계약장식중량 (K18)'}
                              </label>
                              <input
                                type="text"
                                value={weight}
                                onChange={(e) => {
                                  const next = [...claspWeights];
                                  next[idx] = e.target.value;
                                  setClaspWeights(next);
                                }}
                                placeholder="장식중량"
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-brand-accent/50 text-brand-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div 
                      ref={historyResultRef}
                      className={`p-6 rounded-3xl border shadow-sm space-y-6 transition-colors duration-300 ${
                        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-brand-accent'
                      }`}
                    >
                      <div className="text-[15px] leading-relaxed font-medium space-y-4">
                        {historyResult.results.filter(res => Math.abs(res.diffDon) > 0.0001).map((res, idx) => {
                          const cashP = parseFloat(marketPrices[res.purity]?.cash?.replace(/,/g, '') || '0');
                          return (
                            <div key={idx} className="pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className={`text-xs font-bold uppercase tracking-wider ${
                                  res.purity === 'K18' ? 'text-brand-primary' : 
                                  res.purity === 'K14' ? 'text-brand-secondary dark:text-zinc-400' : 
                                  'text-brand-accent'
                                }`}>{res.purity}</div>
                                <div className="text-[10px] text-zinc-400 no-copy">시세: {formatNumber(cashP)}</div>
                              </div>
                              <div>
                                {res.contractDons.length > 1 ? `(${res.contractDons.join('+')})` : (res.contractDons[0] || '0')}
                                -
                                {res.releaseDons.length > 1 ? `(${res.releaseDons.join('+')})` : (res.releaseDons[0] || '0')}
                                = {
                                  Math.abs(res.diffDon) < 0.0001
                                    ? '0'
                                    : (res.diffDon > 0 
                                        ? `${formatNumber(parseFloat(res.diffDon.toFixed(3)))}돈 차감` 
                                        : `${formatNumber(parseFloat(Math.abs(res.diffDon).toFixed(3)))}돈 추가`
                                      )
                                } ▷ {
                                  cashP > 0
                                    ? (Math.abs(res.adjustmentCash) < 1
                                        ? '0'
                                        : (res.adjustmentCash > 0 
                                            ? `${formatNumber(Math.abs(res.adjustmentCash))} 차감` 
                                            : `${formatNumber(Math.abs(res.adjustmentCash))} 추가`
                                          )
                                      )
                                    : '시세를 입력하세요'
                                }
                              </div>
                            </div>
                          );
                        })}
                        
                        <div className="mt-4 pt-4 border-t-2 border-brand-accent/20 dark:border-zinc-800 text-brand-primary dark:text-white font-bold">
                          <span>M{formatNumber(parseFloat(contractPrice.replace(/,/g, '')) || 0)}</span>
                          {(parseFloat(downPayment.replace(/,/g, '')) || 0) > 0 && (
                            <span>-{formatNumber(parseFloat(downPayment.replace(/,/g, '')) || 0)}</span>
                          )}
                          {historyResult.results.map((res, idx) => {
                            if (res.adjustmentCash === 0) return null;
                            return (
                              <span key={idx}>
                                {res.adjustmentCash > 0 ? (
                                  <span>-{formatNumber(res.adjustmentCash)}</span>
                                ) : (
                                  <span>+{formatNumber(Math.abs(res.adjustmentCash))}</span>
                                )}
                              </span>
                            );
                          })}
                          <span>
                            {' '}= {
                              historyResult.finalAmountCash < 0 
                                ? `M${formatNumber(Math.abs(historyResult.finalAmountCash))} 남음 (보관)` 
                                : ((parseFloat(downPayment.replace(/,/g, '')) || 0) > 0 && historyResult.finalAmountCash > 0 
                                    ? `잔금 M${formatNumber(historyResult.finalAmountCash)}` 
                                    : `M${formatNumber(historyResult.finalAmountCash)}`
                                  )
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'link' && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddVendor} className="flex gap-2">
                        <input
                          type="text"
                          value={newVendor}
                          onChange={(e) => setNewVendor(e.target.value)}
                          placeholder="거래처명 입력 (예: 가인)"
                          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-brand-accent/30 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium bg-brand-primary dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          추가
                        </button>
                    </form>

                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">거래처 목록 ([주문링크] 표시 여부)</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[...new Set([...initialSpecialVendors, ...specialVendors, ...Object.keys(parsedData).map(v => v.replace('@', ''))])].sort().map(vendor => (
                          <label 
                            key={vendor} 
                            className="flex items-center gap-3 p-3 rounded-2xl border border-brand-accent/20 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-brand-accent dark:hover:border-brand-accent cursor-pointer transition-all group shadow-sm hover:shadow-md"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={specialVendors.includes(vendor)}
                                onChange={() => toggleVendor(vendor)}
                                className="peer w-5 h-5 rounded-lg border-brand-accent/30 dark:border-zinc-700 text-brand-primary focus:ring-brand-primary transition-all cursor-pointer appearance-none border-2 checked:bg-brand-primary checked:border-brand-primary"
                              />
                              <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" />
                            </div>
                            <span className="text-sm font-semibold text-brand-primary dark:text-zinc-300 truncate group-hover:text-brand-accent transition-colors">{vendor}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm gap-3">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center shadow-inner">
        <ArrowRightLeft className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
      </div>
      <p className="font-medium">입력란에 텍스트를 넣으면 결과가 표시됩니다.</p>
    </div>
  );
}
