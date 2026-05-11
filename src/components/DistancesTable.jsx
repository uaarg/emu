import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { fetchAverages } from "../targets";
import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";

export function DistanceTable() {
  const [loading, setLoading] = useState(true);
  const [distanceAvgs, setDistanceAvgs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAverages()
      .then((averages) => {
        if (!cancelled) {
          setDistanceAvgs(averages || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return loading ? (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
      <Spinner className="w-4 h-4" />
      Loading distances...
    </div>
  ) : error ? (
    <div className="flex items-center justify-center text-sm text-red-600 h-[200px]">
      Error: {error}
    </div>
  ) : distanceAvgs.length === 0 ? (
    <div className="flex items-center justify-center text-sm text-gray-500 h-[200px]">
      Nothing to measure yet. Click on an image to add measurement points.
    </div>
  ) : (
    <ScrollArea className="h-[400px] w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Target A</TableHead>
            <TableHead>Target B</TableHead>
            <TableHead>Distance (mm)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distanceAvgs.map((distance, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium text-sm">{distance.target1}</TableCell>
              <TableCell className="text-sm">{distance.target2}</TableCell>
              <TableCell className="text-sm">{distance.averageDistance?.toFixed(2) || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
