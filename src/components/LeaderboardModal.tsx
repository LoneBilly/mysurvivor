"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  username: string;
  current_zone: string;
  days_alive: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaderboardModal = ({ isOpen, onClose }: LeaderboardModalProps) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!isOpen) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("leaderboard")
          .select("username, current_zone, days_alive")
          .order("days_alive", { ascending: false })
          .limit(10);

        if (error) {
          throw error;
        }
        if (data) {
          setLeaderboardData(data);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Classement des Survivants</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Chargement du classement...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-700/50">
                  <TableHead className="text-white">Pseudo</TableHead>
                  <TableHead className="text-white">Zone Actuelle</TableHead>
                  <TableHead className="text-white text-right">Jours Survécu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.length > 0 ? (
                  leaderboardData.map((entry, index) => (
                    <TableRow key={index} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell>{entry.username}</TableCell>
                      <TableCell>{entry.current_zone}</TableCell>
                      <TableCell className="text-right">{entry.days_alive}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Aucune donnée de classement disponible.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;