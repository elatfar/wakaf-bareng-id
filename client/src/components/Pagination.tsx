import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="text-sm text-[#8B7355]">
        Halaman {currentPage} dari {totalPages}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            "p-2 rounded-md transition-colors",
            currentPage === 1
              ? "text-[#8B7355] cursor-not-allowed"
              : "text-[#2B0F17] hover:bg-[#D9A85C]/20"
          )}
          title="Halaman pertama"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "p-2 rounded-md transition-colors",
            currentPage === 1
              ? "text-[#8B7355] cursor-not-allowed"
              : "text-[#2B0F17] hover:bg-[#D9A85C]/20"
          )}
          title="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={typeof page !== "number"}
            className={cn(
              "min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors",
              typeof page === "number"
                ? page === currentPage
                  ? "bg-[#D9A85C] text-[#2B0F17]"
                  : "text-[#2B0F17] hover:bg-[#D9A85C]/20"
                : "text-[#8B7355] cursor-default"
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "p-2 rounded-md transition-colors",
            currentPage === totalPages
              ? "text-[#8B7355] cursor-not-allowed"
              : "text-[#2B0F17] hover:bg-[#D9A85C]/20"
          )}
          title="Halaman selanjutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            "p-2 rounded-md transition-colors",
            currentPage === totalPages
              ? "text-[#8B7355] cursor-not-allowed"
              : "text-[#2B0F17] hover:bg-[#D9A85C]/20"
          )}
          title="Halaman terakhir"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
