const {ensure}=require('./http');

// Photos arrive as JPEG Blobs generated in the browser (JPG/PNG/WebP inputs supported).
// Reject forged content types and oversized files before storing bytes in MongoDB.
const MAX_IMAGE_BYTES=350*1024;
const sofMarkers=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
function validateMenuImage(bytes){
  ensure(Buffer.isBuffer(bytes),400,'Please select a JPEG product image.');
  ensure(bytes.length>=100 && bytes.length<=MAX_IMAGE_BYTES,400,'Image must be a JPEG smaller than 350 KB.');
  ensure(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff &&
    bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9,
    400,'Invalid JPEG image. Please select a JPG, PNG or WebP photo again.');
  let offset=2,hasDimensions=false;
  while(offset+4<bytes.length){
    ensure(bytes[offset]===0xff,400,'Invalid JPEG marker.');
    while(bytes[offset]===0xff)offset++;
    const marker=bytes[offset++];
    if(marker===0xda||marker===0xd9)break; // Compressed pixels / end marker.
    if(marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    ensure(offset+2<=bytes.length,400,'Invalid JPEG segment.');
    const length=bytes.readUInt16BE(offset);
    ensure(length>=2&&offset+length<=bytes.length,400,'Invalid JPEG segment length.');
    if(sofMarkers.has(marker)){
      ensure(length>=7,400,'Invalid JPEG dimensions.');
      const height=bytes.readUInt16BE(offset+3),width=bytes.readUInt16BE(offset+5);
      ensure(width>=1&&height>=1&&width<=2500&&height<=2500,400,'JPEG dimensions exceed the allowed size.');
      hasDimensions=true;
    }
    offset+=length;
  }
  ensure(hasDimensions,400,'Cannot read JPEG dimensions.');
  return bytes;
}
module.exports={validateMenuImage,MAX_IMAGE_BYTES};
