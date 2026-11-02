// Word differences preserve both answers; they do not assign a quality score.
export function diffWords(left,right){
 const a=left.match(/\s+|[^\s]+/g)||[],b=right.match(/\s+|[^\s]+/g)||[];
 const rows=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)rows[i][j]=a[i]===b[j]?1+rows[i+1][j+1]:Math.max(rows[i+1][j],rows[i][j+1]);
 let i=0,j=0;const l=[],r=[];
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){l.push([a[i++],false]);r.push([b[j++],false]);}else if(i<a.length&&(j===b.length||rows[i+1][j]>=rows[i][j+1]))l.push([a[i++],true]);else r.push([b[j++],true]);}
 return [l,r];
}
