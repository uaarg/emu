import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { fetchAverages } from "@/targets";
import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";

function LoadingSpinner() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-4 [--radius:1rem]">
      <Item variant="muted">
        <ItemMedia>
          <Spinner />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="line-clamp-1">Loading average distances</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  )
}

export function DistanceTable() {
  const [loading, setLoading] = useState(true);
  const [distanceAvgs, setDistanceAvgs] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchAverages()
      .then((averages) => {
        if (cancelled) return;
        setDistanceAvgs(averages);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    loading ? (
      <LoadingSpinner></LoadingSpinner>
    ) : (
      <ScrollArea className="h-[400px] w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Target A</TableHead>
              <TableHead>Target B</TableHead>
              <TableHead>Distance (milimeters)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distanceAvgs && distanceAvgs.map((distance, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{distance.target1}</TableCell>
                <TableCell>{distance.target2}</TableCell>
                <TableCell>{distance.averageDistance.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table >
      </ScrollArea>
    )
  )
}
