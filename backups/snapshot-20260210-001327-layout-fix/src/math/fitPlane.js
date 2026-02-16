function inv3(m) {
  const [[a,b,c],[d,e,f],[g,h,i]] = m;

  const A =  (e*i - f*h);
  const B = -(d*i - f*g);
  const C =  (d*h - e*g);
  const D = -(b*i - c*h);
  const E =  (a*i - c*g);
  const F = -(a*h - b*g);
  const G =  (b*f - c*e);
  const H = -(a*f - c*d);
  const I =  (a*e - b*d);

  const det = a*A + b*B + c*C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;

  return [
    [A/det, D/det, G/det],
    [B/det, E/det, H/det],
    [C/det, F/det, I/det],
  ];
}

function mulMatVec(m, v) {
  return m.map(row => row[0]*v[0] + row[1]*v[1] + row[2]*v[2]);
}

export function fitPlane(points) {
  if (!points || points.length < 3) return { a: 0, b: 0, c: 0 };

  let sxx=0, sxy=0, sx1=0;
  let syy=0, sy1=0;
  let s11=0;
  let sxz=0, syz=0, s1z=0;

  for (const p of points) {
    const x = Number(p[0]);
    const y = Number(p[1]);
    const z = Number(p[2]);
    if (![x,y,z].every(Number.isFinite)) continue;

    sxx += x*x;  sxy += x*y;  sx1 += x;
    syy += y*y;  sy1 += y;    s11 += 1;
    sxz += x*z;  syz += y*z;  s1z += z;
  }

  const XtX = [
    [sxx, sxy, sx1],
    [sxy, syy, sy1],
    [sx1, sy1, s11],
  ];
  const Xtz = [sxz, syz, s1z];

  const inv = inv3(XtX);
  if (!inv) return { a: 0, b: 0, c: 0 };

  const [a,b,c] = mulMatVec(inv, Xtz);
  if (![a,b,c].every(Number.isFinite)) return { a: 0, b: 0, c: 0 };

  return { a, b, c };
}
