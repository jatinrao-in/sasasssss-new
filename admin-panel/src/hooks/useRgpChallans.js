import { useRgp } from './useRgp';

export function useRgpChallans() {
 const { rgpList, loading, addRgp, updateRgp, markClosed } = useRgp();

 return {
 rgpChallans: rgpList,
 loading,
 addRgpChallan: addRgp,
 updateRgpChallan: updateRgp,
 markClosed,
 };
}
