import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type Event = {
  id: number;
  name: string;
  eventDate: string;
  status: string;
  locationId: number;
};

type ReportData = {
  eventId: string;
  stations: Array<{
    stationId: number;
    stationName: string;
    items: Array<{
      productId: number;
      productName: string;
      quantity: number;
      costPrice: string;
      totalCost: number;
    }>;
    totalCost: number;
  }>;
  totalCost: number;
};

export default function Reports() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<ReportData>({
    queryKey: ['/api/reports/end-of-night', selectedEventId],
    enabled: !!selectedEventId,
  });

  const handleExportPDF = () => {
    if (!reportData) return;

    const event = events.find(e => e.id === parseInt(selectedEventId));
    if (!event) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header
    pdf.setFontSize(20);
    pdf.text("Event4U - Report Fine Serata", pageWidth / 2, 20, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.text(`Evento: ${event.name}`, 20, 35);
    pdf.text(`Data: ${new Date(event.eventDate).toLocaleDateString('it-IT')}`, 20, 42);
    
    pdf.setFontSize(14);
    pdf.text(`Costo Totale: €${reportData.totalCost.toFixed(2)}`, 20, 55);

    let yPosition = 70;

    // Station reports
    reportData.stations.forEach((station) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Postazione: ${station.stationName}`, 20, yPosition);
      yPosition += 7;
      
      pdf.setFont(undefined, 'normal');
      pdf.text(`Costo: €${station.totalCost.toFixed(2)}`, 20, yPosition);
      yPosition += 10;

      station.items.forEach((item) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(10);
        pdf.text(
          `- ${item.productName}: ${item.quantity.toFixed(2)} x €${parseFloat(item.costPrice).toFixed(2)} = €${item.totalCost.toFixed(2)}`,
          25,
          yPosition
        );
        yPosition += 6;
      });

      yPosition += 5;
    });

    pdf.save(`report-${event.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const event = events.find(e => e.id === parseInt(selectedEventId));
    if (!event) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Event4U - Report Fine Serata"],
      [""],
      ["Evento", event.name],
      ["Data", new Date(event.eventDate).toLocaleDateString('it-IT')],
      ["Costo Totale", `€${reportData.totalCost.toFixed(2)}`],
      [""],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Riepilogo");

    // Detailed breakdown sheet
    const detailedData: any[] = [
      ["Postazione", "Prodotto", "Quantità", "Prezzo Unitario", "Costo Totale"],
    ];

    reportData.stations.forEach((station) => {
      station.items.forEach((item) => {
        detailedData.push([
          station.stationName,
          item.productName,
          item.quantity.toFixed(2),
          `€${parseFloat(item.costPrice).toFixed(2)}`,
          `€${item.totalCost.toFixed(2)}`,
        ]);
      });
    });

    const detailedWs = XLSX.utils.aoa_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, detailedWs, "Dettaglio");

    // Download
    XLSX.writeFile(wb, `report-${event.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Report</h1>
          <p className="text-muted-foreground">Report fine serata per evento</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleziona Evento</CardTitle>
          <CardDescription>Scegli un evento per visualizzare il report</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger data-testid="select-event">
              <SelectValue placeholder="Seleziona un evento" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name} - {new Date(event.eventDate).toLocaleDateString('it-IT')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {reportLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento report...</p>
        </div>
      )}

      {reportData && !reportLoading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Riepilogo</CardTitle>
                  <CardDescription>Costo totale consumi</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={!reportData || reportLoading}
                    data-testid="button-export-pdf"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Esporta PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={!reportData || reportLoading}
                    data-testid="button-export-excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Esporta Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-semibold" data-testid="text-total-cost">
                  €{reportData.totalCost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {reportData.stations.length} postazioni
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dettaglio per Postazione</CardTitle>
              <CardDescription>Consumi suddivisi per postazione</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {reportData.stations.map((station) => (
                  <AccordionItem key={station.stationId} value={station.stationId.toString()}>
                    <AccordionTrigger data-testid={`accordion-station-${station.stationId}`}>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{station.stationName}</span>
                        <span className="text-sm text-muted-foreground">
                          €{station.totalCost.toFixed(2)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Prodotto</TableHead>
                            <TableHead className="text-right">Quantità</TableHead>
                            <TableHead className="text-right">Prezzo Unitario</TableHead>
                            <TableHead className="text-right">Totale</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {station.items.map((item, idx) => (
                            <TableRow key={idx} data-testid={`row-product-${item.productId}`}>
                              <TableCell data-testid={`text-product-name-${item.productId}`}>
                                {item.productName}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.quantity.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                €{parseFloat(item.costPrice).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                €{item.totalCost.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedEventId && !reportLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Seleziona un evento per visualizzare il report
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
