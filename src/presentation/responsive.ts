export type TableLayout='table'|'phone-portrait'|'ipad-portrait'|'phone-landscape';

// Use CSS pixels in the table's container, independent of device name or DPR.
export function tableLayout(width:number,height:number):TableLayout{
 if(height>width)return width<600?'phone-portrait':'ipad-portrait';
 return height<600?'phone-landscape':'table';
}
