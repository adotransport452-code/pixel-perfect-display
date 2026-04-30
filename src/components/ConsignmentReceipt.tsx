import { forwardRef } from "react";
import receiptTemplate from "@/assets/consignment-receipt-template-blank.jpg";
import { Consignment } from "@/lib/store";

export const ConsignmentReceipt = forwardRef<HTMLDivElement, { c: Consignment; width?: number; translate?: boolean }>(function ConsignmentReceipt({ c, width, translate = false }, ref) {
  const isGuangzhou = (c.start_station || "").toLowerCase().includes("guangzhou");
  const isYiwu = (c.start_station || "").toLowerCase().includes("yiwu");
  const stationLabel = isGuangzhou ? "Guangzhou" : isYiwu ? "Yiwu" : c.start_station;
  const receivedBy = isGuangzhou ? "Ken Guangzhou" : isYiwu ? "Yiwu Su" : "";

  const totalAmountNum = Math.trunc(Number(c.grand_total || 0));
  const totalInWords = numberToWords(totalAmountNum);

  const text = {
    billNo: c.bill_no || "",
    startDate: c.start_date || "",
    marka: c.marka || "",
    phone: c.client_phone || "",
    description: c.description || "",
    packageType: c.package_type || "",
    quantity: String(c.quantity ?? ""),
    ctnNo: c.ctn_no || "",
    packagingFee: formatAmount(c.packaging_fee),
    loadingFee: formatAmount(c.loading_fee),
    unloadingFee: formatAmount(c.unloading_fee),
    cbm: formatAmount(c.cbm),
    weight: formatAmount(c.weight),
    tax: formatAmount(c.tax),
    freight: formatAmount(c.freight),
    localFreight: formatAmount(c.local_freight),
    valueOfGoods: formatAmount(c.value_of_goods),
    insurance: formatAmount(c.insurance),
    billCharge: formatAmount(c.bill_charge),
    advance: formatAmount(c.advance_amount),
    total: String(Math.trunc(Number(c.grand_total || 0)) || ""),
    totalWords: totalInWords,
    freightOnDelivery: formatAmount(c.payment_of_goods),
    tradeMode: c.trade_mode || "",
    remarks: c.remarks || "",
    destination: c.end_station || "",
    station: stationLabel || "",
    signature: receivedBy,
  };

  const NATIVE_W = 1578;
  const NATIVE_H = 997;
  const TARGET_W = width ?? 1200;
  const scale = TARGET_W / NATIVE_W;

  return (
    <div className="overflow-auto" ref={ref}>
      <div className="relative mx-auto font-sans text-black bg-white" style={{ width: `${TARGET_W}px`, height: `${NATIVE_H * scale}px` }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: `${NATIVE_W}px`, height: `${NATIVE_H}px`, transform: `scale(${scale})` }}>
          <img src={receiptTemplate} alt="Consignment receipt template" className="absolute inset-0 h-full w-full select-none" draggable={false} />

          <BillNoText value={text.billNo} />
          <FillText className="left-[284px] top-[290px] w-[464px] text-[17px] font-semibold" value={text.startDate} />
          <FillText className="left-[286px] top-[369px] w-[463px] text-[17px] font-semibold" value={text.marka} />

          <FillText className="left-[1062px] top-[210px] w-[493px] text-[24px] font-bold text-[#2ea24f]" value={text.station} />
          <FillText className="left-[1061px] top-[290px] w-[495px] text-[20px] font-bold text-[#e11d1d]" value={text.destination} />
          <FillText className="left-[1061px] top-[369px] w-[495px] text-[18px] font-semibold" value={text.phone} />

          <FillText className="left-[4px] top-[522px] w-[274px] text-[17px] font-semibold" value={text.description} />
          <FillText className="left-[278px] top-[522px] w-[101px] text-[17px] font-semibold" value={text.packageType} />
          <FillText className="left-[379px] top-[522px] w-[110px] text-[17px] font-semibold" value={text.quantity} />
          <FillText className="left-[489px] top-[522px] w-[107px] text-[17px] font-semibold" value={text.ctnNo} />
          <FillText className="left-[596px] top-[522px] w-[158px] text-[17px] font-semibold" value={text.packagingFee} />
          <FillText className="left-[754px] top-[522px] w-[87px] text-[17px] font-semibold" value={text.loadingFee} />
          <FillText className="left-[841px] top-[522px] w-[113px] text-[17px] font-semibold" value={text.unloadingFee} />
          <FillText className="left-[954px] top-[522px] w-[102px] text-[17px] font-semibold" value={text.cbm} />
          <FillText className="left-[1056px] top-[522px] w-[153px] text-[17px] font-semibold" value={text.weight} />
          <FillText className="left-[1209px] top-[522px] w-[112px] text-[17px] font-semibold" value={text.tax} />
          <FillText className="left-[1321px] top-[522px] w-[99px] text-[17px] font-semibold" value={text.freight} />
          <FillText className="left-[1420px] top-[522px] w-[157px] text-[17px] font-semibold" value={text.localFreight} />

          <FillText className="left-[0px] top-[608px] w-[277px] text-[17px] font-semibold" value={text.valueOfGoods} />
          <FillText className="left-[277px] top-[608px] w-[211px] text-[17px] font-semibold" value={text.insurance} />
          <FillText className="left-[488px] top-[608px] w-[264px] text-[17px] font-semibold" value={text.billCharge} />
          <FillText className="left-[752px] top-[608px] w-[303px] text-[17px] font-semibold" value={text.advance} />
          <FillText className="left-[1055px] top-[608px] w-[151px] text-[18px] font-bold text-[#e11d1d]" value={text.total} />
          <FillText className="left-[1206px] top-[608px] w-[215px] text-[17px] font-semibold" value={text.freightOnDelivery} />
          <FillText className="left-[1421px] top-[608px] w-[155px] text-[17px] font-bold text-[#e11d1d]" value={text.tradeMode} />

          {text.totalWords && (
            <div className="absolute left-[278px] top-[640px] flex h-[43px] w-[1298px] items-center justify-center px-6 text-center text-[18px] font-bold leading-none text-black">
              {text.totalWords}
            </div>
          )}

          <div className="absolute left-[278px] top-[684px] flex h-[53px] w-[777px] items-center justify-center px-4 text-center text-[15px] font-medium leading-tight text-black">
            {text.remarks}
          </div>

          <div className="absolute left-[1206px] top-[684px] flex h-[53px] w-[370px] items-center justify-center px-4 text-center text-[18px] font-bold leading-none text-black">
            {text.signature}
          </div>

          {text.station && (
            <div className="absolute left-[560px] top-[155px] w-[460px] text-[28px] font-extrabold text-[#2ea24f] text-center leading-none">
              {text.station}
            </div>
          )}

          <div className="absolute left-[1206px] top-[683px] h-[54px] w-[2px] bg-black" />
          <div className="absolute left-[1576px] top-[683px] h-[54px] w-[2px] bg-black" />
          <div className="absolute left-[1206px] top-[736px] h-[2px] w-[370px] bg-black" />

          {/* English translation overlay — only masks Chinese-only text on the template (English labels already exist) */}
          {translate && (<>
          {/* Top header — Chinese company name (top line) and Chinese address (line below the English name) */}
          <EnHeader className="left-[440px] top-[8px] w-[700px] h-[34px] text-[18px]" text="ADO INTERNATIONAL SUPPLY CHAIN MANAGEMENT CO LTD" />
          <EnHeader className="left-[440px] top-[58px] w-[700px] h-[34px] text-[14px]" text="No. 1F001, Linglong International, Fenggangcun, Shijing, Baiyun, Guangzhou, Guangdong" />

          {/* Field labels — mask the Chinese line (upper half of each label cell) and place English label */}
          <EnLabel className="left-[6px] top-[195px] w-[270px] h-[34px]" text="CONSIGNMENT NO" />
          <EnLabel className="left-[760px] top-[195px] w-[295px] h-[34px]" text="STARTING STATION" />
          <EnLabel className="left-[6px] top-[275px] w-[270px] h-[34px]" text="CONSIGNMENT DATE" />
          <EnLabel className="left-[760px] top-[275px] w-[295px] h-[34px]" text="DESTINATION" />
          <EnLabel className="left-[6px] top-[354px] w-[270px] h-[34px]" text="CONSIGNMENT MARK" />
          <EnLabel className="left-[760px] top-[354px] w-[295px] h-[34px]" text="TELEPHONE" />

          {/* Column header row 1 — mask Chinese cells above each English column header */}
          <EnLabel className="left-[6px] top-[434px] w-[270px] h-[28px]" text="DESCRIPTION" />
          <EnLabel className="left-[280px] top-[434px] w-[97px] h-[28px]" text="PACKAGE" />
          <EnLabel className="left-[381px] top-[434px] w-[106px] h-[28px]" text="QUANTITY" />
          <EnLabel className="left-[491px] top-[434px] w-[103px] h-[28px]" text="CTN NO" />
          <EnLabel className="left-[598px] top-[434px] w-[154px] h-[28px]" text="PACKAGING FEE" />
          <EnLabel className="left-[754px] top-[434px] w-[200px] h-[28px]" text="LOAD / UNLOAD" />
          <EnLabel className="left-[956px] top-[434px] w-[98px] h-[28px]" text="CBM" />
          <EnLabel className="left-[1058px] top-[434px] w-[149px] h-[28px]" text="WEIGHT" />
          <EnLabel className="left-[1211px] top-[434px] w-[108px] h-[28px]" text="TAX" />
          <EnLabel className="left-[1323px] top-[434px] w-[95px] h-[28px]" text="FREIGHT" />
          <EnLabel className="left-[1422px] top-[434px] w-[153px] h-[28px]" text="LOCAL FREIGHT" />

          {/* Column header row 2 (totals row) */}
          <EnLabel className="left-[6px] top-[520px] w-[270px] h-[28px]" text="VALUE OF GOODS" />
          <EnLabel className="left-[280px] top-[520px] w-[207px] h-[28px]" text="INSURANCE" />
          <EnLabel className="left-[491px] top-[520px] w-[260px] h-[28px]" text="BILL CHARGE" />
          <EnLabel className="left-[754px] top-[520px] w-[300px] h-[28px]" text="ADVANCE" />
          <EnLabel className="left-[1057px] top-[520px] w-[148px] h-[28px] text-red-600" text="TOTAL AMOUNT" />
          <EnLabel className="left-[1208px] top-[520px] w-[212px] h-[28px]" text="FREIGHT ON DELIVERY" />
          <EnLabel className="left-[1423px] top-[520px] w-[152px] h-[28px]" text="TRADE MODE" />

          {/* "元整" Chinese suffix on TOTAL AMOUNT IN WORDS row — mask only */}
          <Mask className="left-[222px] top-[620px] w-[55px] h-[22px]" />

          {/* "备注" (Remarks) and "收货人签字" (Signature) labels */}
          <EnLabel className="left-[6px] top-[665px] w-[270px] h-[28px]" text="REMARKS" />
          <EnLabel className="left-[1057px] top-[665px] w-[150px] h-[28px]" text="SIGNATURE" />

          {/* "注意事项" before (NOTES) */}
          <Mask className="left-[560px] top-[745px] w-[100px] h-[26px]" />
          <div className="absolute left-[560px] top-[745px] w-[100px] h-[26px] flex items-center justify-end pr-1 text-[14px] font-bold text-black">NOTES:</div>
          </>)}
        </div>
      </div>
    </div>
  );
});

function EnLabel({ className, text }: { className: string; text: string }) {
  return (
    <div className={`absolute flex items-center justify-center bg-white text-[13px] font-bold uppercase tracking-wide text-black ${className}`}>
      {text}
    </div>
  );
}

function Mask({ className }: { className: string }) {
  return <div className={`absolute bg-white ${className}`} />;
}

function EnHeader({ className, text }: { className: string; text: string }) {
  return (
    <div className={`absolute flex items-center justify-center bg-white font-bold tracking-wide text-black ${className}`}>
      {text}
    </div>
  );
}

function FillText({ className, value }: { className: string; value: string }) {
  if (!value) return null;
  return <div className={`absolute text-center leading-none ${className}`}>{value}</div>;
}

function BillNoText({ value }: { value: string }) {
  if (!value) return null;
  // Cell box: left 288, top 210, width 460, height ~70 (between 195 label and 275 next label)
  // Auto-shrink font size based on length so multi-consignment IDs wrap & fit within the cell
  const len = value.length;
  const fontSize = len > 60 ? 11 : len > 45 ? 12 : len > 32 ? 14 : 17;
  return (
    <div
      className="absolute flex items-center justify-center text-center font-semibold"
      style={{
        left: 288,
        top: 210,
        width: 460,
        height: 60,
        fontSize: `${fontSize}px`,
        lineHeight: 1.15,
        wordBreak: "break-all",
        overflowWrap: "anywhere",
        whiteSpace: "normal",
        padding: "2px 4px",
      }}
    >
      {value}
    </div>
  );
}

function formatAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2);
}

function numberToWords(num: number): string {
  if (!isFinite(num) || num === 0) return "";
  const negative = num < 0;
  const n = Math.abs(num);
  const whole = Math.floor(n);

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function under1000(x: number): string {
    let s = "";
    if (x >= 100) {
      s += ones[Math.floor(x / 100)] + " Hundred";
      x %= 100;
      if (x) s += " ";
    }
    if (x >= 20) {
      s += tens[Math.floor(x / 10)];
      if (x % 10) s += "-" + ones[x % 10];
    } else if (x > 0) {
      s += ones[x];
    }
    return s;
  }

  function toWords(x: number): string {
    if (x === 0) return "Zero";
    const units = ["", "Thousand", "Million", "Billion"];
    let i = 0;
    let result = "";
    while (x > 0) {
      const chunk = x % 1000;
      if (chunk) {
        result = under1000(chunk) + (units[i] ? " " + units[i] : "") + (result ? " " + result : "");
      }
      x = Math.floor(x / 1000);
      i++;
    }
    return result;
  }

  let words = toWords(whole);
  words += " Only";
  return (negative ? "Negative " : "") + words;
}