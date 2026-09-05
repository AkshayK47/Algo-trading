import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Check, 
  ChevronDown, 
  X, 
  Search, 
  Layers, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import { PRIMARY_SECTORS, ALL_INDIAN_STOCKS_UNIVERSE, getStockSectorCategory } from '../stockUniverse';
import { SectorOption } from '../types';

interface SectorMultiSelectProps {
  selectedSectors: string[];
  onChange: (sectors: string[]) => void;
  universeChoice?: string;
}

export const SectorMultiSelect: React.FC<SectorMultiSelectProps> = ({
  selectedSectors,
  onChange,
  universeChoice = 'ALL',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute stock counts for each primary sector based on current universe
  const sectorCounts = useMemo(() => {
    let pool = ALL_INDIAN_STOCKS_UNIVERSE;
    if (universeChoice === 'LARGE') {
      pool = pool.filter((s) => s.category.includes('Large-Cap'));
    } else if (universeChoice === 'MID') {
      pool = pool.filter((s) => s.category.includes('Mid-Cap'));
    }

    const counts: Record<string, number> = {};
    PRIMARY_SECTORS.forEach((s) => {
      counts[s.id] = pool.filter((stock) => getStockSectorCategory(stock.sector) === s.id).length;
    });
    return counts;
  }, [universeChoice]);

  // Filtered sectors by search query
  const filteredSectors = useMemo(() => {
    if (!searchQuery.trim()) return PRIMARY_SECTORS;
    const q = searchQuery.toLowerCase();
    return PRIMARY_SECTORS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortLabel.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleSector = (sectorId: string) => {
    if (selectedSectors.includes(sectorId)) {
      onChange(selectedSectors.filter((id) => id !== sectorId));
    } else {
      onChange([...selectedSectors, sectorId]);
    }
  };

  const removeSector = (sectorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedSectors.filter((id) => id !== sectorId));
  };

  const handleSelectAll = () => {
    onChange(PRIMARY_SECTORS.map((s) => s.id));
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 block font-medium">Sector Selection</label>
        {selectedSectors.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition underline underline-offset-2 cursor-pointer"
          >
            Reset to All
          </button>
        )}
      </div>

      {/* Trigger Control */}
      <div
        id="sector-multiselect-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-[#16161A] border ${
          isOpen ? 'border-[#4A90E2] ring-1 ring-[#4A90E2]/30' : 'border-[#23232A]'
        } rounded-md px-3 py-2 text-xs text-zinc-200 cursor-pointer transition hover:border-[#32323C] flex items-center justify-between min-h-[36px]`}
      >
        <div className="flex items-center space-x-2 truncate pr-1">
          <Layers className="w-3.5 h-3.5 text-[#4A90E2] shrink-0" />
          {selectedSectors.length === 0 ? (
            <span className="text-zinc-400">All Sectors ({PRIMARY_SECTORS.length})</span>
          ) : (
            <span className="font-semibold text-white">
              {selectedSectors.length === 1 ? (
                PRIMARY_SECTORS.find((s) => s.id === selectedSectors[0])?.shortLabel || selectedSectors[0]
              ) : (
                `${selectedSectors.length} Sectors Active`
              )}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {selectedSectors.length > 0 && (
            <span className="bg-[#4A90E2]/15 text-[#60A5FA] px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border border-[#4A90E2]/30">
              {selectedSectors.length}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#4A90E2]' : ''
            }`}
          />
        </div>
      </div>

      {/* Selected Tags Chips (Visible below trigger for fast removal) */}
      {selectedSectors.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto pr-1">
          {selectedSectors.map((sectorId) => {
            const sec = PRIMARY_SECTORS.find((s) => s.id === sectorId);
            const label = sec ? sec.shortLabel : sectorId;
            return (
              <span
                key={sectorId}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1C1C22] border border-[#2B2B36] text-[11px] text-zinc-200"
              >
                <span>{label}</span>
                <button
                  type="button"
                  onClick={(e) => removeSector(sectorId, e)}
                  className="text-zinc-400 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                  title={`Remove ${label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div 
          id="sector-dropdown-menu"
          className="absolute left-0 right-0 top-full mt-1 bg-[#16161A] border border-[#2B2B36] rounded-md shadow-2xl z-50 overflow-hidden text-xs flex flex-col max-h-72"
        >
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-[#23232A] bg-[#121215]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IT, Banking, FMCG..."
                className="w-full bg-[#1A1A20] border border-[#2B2B36] rounded pl-8 pr-3 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#4A90E2]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#1E1E24] text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#4A90E2] hover:text-[#60A5FA] font-medium flex items-center space-x-1 cursor-pointer"
              >
                <CheckSquare className="w-3 h-3" />
                <span>Select All ({PRIMARY_SECTORS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleClearAll()}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Sectors Options List */}
          <div className="overflow-y-auto flex-1 divide-y divide-[#1F1F26] p-1">
            {filteredSectors.length === 0 ? (
              <div className="py-4 text-center text-zinc-500 text-[11px]">
                No sectors matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredSectors.map((sector) => {
                const isSelected = selectedSectors.includes(sector.id);
                const count = sectorCounts[sector.id] ?? 0;

                return (
                  <div
                    key={sector.id}
                    onClick={() => toggleSector(sector.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-[#4A90E2]/15 text-white'
                        : 'text-zinc-300 hover:bg-[#1C1C22]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-[#4A90E2] border-[#4A90E2] text-white'
                            : 'border-[#3A3A46] bg-[#121215]'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate text-xs font-medium">{sector.name}</span>
                    </div>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101014] text-zinc-400 border border-[#23232A] shrink-0">
                      {count} stocks
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Status */}
          <div className="p-2 border-t border-[#23232A] bg-[#121215] flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              {selectedSectors.length === 0
                ? 'Scanning all sectors'
                : `${selectedSectors.length} of ${PRIMARY_SECTORS.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 bg-[#1F1F26] hover:bg-[#282832] text-zinc-200 rounded text-[11px] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
