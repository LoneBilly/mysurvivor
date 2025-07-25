import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Building, Construction, ConstructionJob } from '@/types/types'
import { BuildingCard } from './BuildingCard'
import { ConstructionJobCard } from './ConstructionJobCard'
import { FoundationCard } from './FoundationCard'
import { DemolishModal } from './DemolishModal'
import { UpgradeModal } from './UpgradeModal'
import { BuildingModal } from './BuildingModal'
import { usePlayer } from '@/contexts/PlayerContext'
import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase'
import { useQueryClient } from '@tanstack/react-query'

const GRID_SIZE = 7
const CELL_SIZE_PX = 96
const CELL_GAP = 8

export function BaseInterface() {
  const { base, constructionJobs, setSelectedBuilding, selectedBuilding } = usePlayer()
  const queryClient = useQueryClient()
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null)
  const [isDemolishModalOpen, setDemolishModalOpen] = useState(false)
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [isBuildingModalOpen, setBuildingModalOpen] = useState(false)

  const constructions = base?.baseConstructions ?? []
  const foundations = constructions.filter((c) => c.type === 'foundation')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const handleDragStart = (event: any) => {
    const building = event.active.data.current?.building
    if (building) {
      setActiveBuilding(building)
      setSelectedBuilding(building)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveBuilding(null)
    const { active, over } = event

    if (active.id === over?.id) return

    if (active.data.current?.building && over?.data.current?.foundation) {
      const building = active.data.current.building as Building
      const foundation = over.data.current.foundation as Construction

      const { data: job, error } = await supabase.rpc('start_building_on_foundation', {
        p_x: foundation.x,
        p_y: foundation.y,
        p_building_type: building.type
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`Construction de ${building.name} commencée !`)
        queryClient.invalidateQueries({ queryKey: ['playerData'] })
      }
    }
  }

  const handleFoundationClick = (foundation: Construction) => {
    setSelectedBuilding(foundation)
    setBuildingModalOpen(true)
  }

  const handleBuildingClick = (building: Construction) => {
    setSelectedBuilding(building)
    setUpgradeModalOpen(true)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} sensors={sensors}>
      <div
        className="relative bg-zinc-100 p-4 rounded-lg"
        style={{
          width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP) + 32,
          height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP) + 32
        }}
      >
        <div
          className="relative"
          style={{
            width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
            height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP)
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE
            const y = Math.floor(i / GRID_SIZE)
            const foundation = foundations.find((f) => f.x === x && f.y === y)
            const construction = constructions.find((c) => c.x === x && c.y === y && c.type !== 'foundation')
            const job = constructionJobs?.find((j) => j.x === x && j.y === y)

            return (
              <div
                key={`cell-${x}-${y}`}
                className="absolute bg-zinc-200/50 rounded"
                style={{
                  left: x * (CELL_SIZE_PX + CELL_GAP),
                  top: y * (CELL_SIZE_PX + CELL_GAP),
                  width: CELL_SIZE_PX,
                  height: CELL_SIZE_PX
                }}
              >
                {foundation && !construction && !job && (
                  <FoundationCard foundation={foundation} onClick={() => handleFoundationClick(foundation)} />
                )}
                {construction && <BuildingCard construction={construction} onClick={() => handleBuildingClick(construction)} />}
                {job && <ConstructionJobCard job={job} />}
              </div>
            )
          })}
        </div>
      </div>
      <DragOverlay>
        {activeBuilding ? (
          <div className="pointer-events-none">
            <BuildingCard building={activeBuilding} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
      {selectedBuilding && (
        <>
          <DemolishModal
            isOpen={isDemolishModalOpen}
            setIsOpen={setDemolishModalOpen}
            construction={selectedBuilding}
          />
          <UpgradeModal
            isOpen={isUpgradeModalOpen}
            setIsOpen={setUpgradeModalOpen}
            construction={selectedBuilding}
          />
          <BuildingModal
            isOpen={isBuildingModalOpen}
            setIsOpen={setBuildingModalOpen}
            foundation={selectedBuilding}
          />
        </>
      )}
    </DndContext>
  )
}