import { useRgp } from './useRgp';

export function useRgpChallans() {
 const { rgpList, loading, addRgp, updateRgp, deleteRgp, markClosed } = useRgp();

 return {
 rgpChallans: rgpList,
 loading,
 addRgpChallan: addRgp,
 updateRgpChallan: updateRgp,
 deleteRgpChallan: deleteRgp,
 markClosed,
 };
}
