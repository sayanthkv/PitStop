import { Vehicle } from '../models/Vehicle.js';
import { FuelEntry } from '../models/FuelEntry.js';
import { ServiceEntry } from '../models/ServiceEntry.js';
import { OdometerReading } from '../models/OdometerReading.js';
import { VehicleDocument } from '../models/VehicleDocument.js';
import { generatePdfReport, generateCsvReport } from '../services/reportsService.js';

export async function downloadPdfReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const filter = { user: req.user._id, vehicle: vehicle._id };
    if (from || to) filter.date = dateFilter;

    const [fuelEntries, serviceEntries, odometerReadings, documents] = await Promise.all([
      FuelEntry.find(filter).sort({ date: -1 }).lean(),
      ServiceEntry.find(filter).sort({ date: -1 }).lean(),
      OdometerReading.find(filter).sort({ date: -1 }).lean(),
      VehicleDocument.find({ user: req.user._id, vehicle: vehicle._id }).sort({ expiryDate: 1 }).lean(),
    ]);

    const pdfBuffer = await generatePdfReport({
      vehicle,
      fuelEntries,
      serviceEntries,
      odometerReadings,
      documents,
      dateRange: { from, to },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=NTORQ_Companion_Report_${vehicle.registrationNumber || 'Scooter'}.pdf`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function downloadCsvReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const filter = { user: req.user._id, vehicle: vehicle._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const [fuelEntries, serviceEntries, odometerReadings] = await Promise.all([
      FuelEntry.find(filter).sort({ date: 1 }).lean(),
      ServiceEntry.find(filter).sort({ date: 1 }).lean(),
      OdometerReading.find(filter).sort({ date: 1 }).lean(),
    ]);

    const csvData = generateCsvReport({
      vehicle,
      fuelEntries,
      serviceEntries,
      odometerReadings,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=NTORQ_Companion_Export_${vehicle.registrationNumber || 'Data'}.csv`
    );
    return res.send(csvData);
  } catch (error) {
    next(error);
  }
}
