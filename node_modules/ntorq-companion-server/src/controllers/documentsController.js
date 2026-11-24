import { VehicleDocument } from '../models/VehicleDocument.js';
import { Vehicle } from '../models/Vehicle.js';
import { calculateDocumentExpiry } from '../utils/calculations.js';
import { vehicleDocumentSchema, documentRenewalSchema } from '../validators/schemas.js';

export async function addDocument(req, res, next) {
  try {
    const data = vehicleDocumentSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const doc = new VehicleDocument({
      user: req.user._id,
      vehicle: vehicle._id,
      ...data,
    });

    await doc.save();

    const expiryInfo = calculateDocumentExpiry(doc.expiryDate);

    return res.status(201).json({
      success: true,
      message: 'Document saved.',
      document: {
        ...doc.toObject(),
        expiryStatus: expiryInfo.status,
        daysRemaining: expiryInfo.daysRemaining,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const docs = await VehicleDocument.find({ user: req.user._id, vehicle: vehicle._id })
      .sort({ expiryDate: 1 }) // Sorted by urgency
      .lean();

    const enrichedDocs = docs.map((d) => {
      const exp = calculateDocumentExpiry(d.expiryDate);
      return {
        ...d,
        expiryStatus: exp.status,
        daysRemaining: exp.daysRemaining,
        isUrgent: exp.isUrgent,
      };
    });

    return res.json({
      success: true,
      documents: enrichedDocs,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentById(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await VehicleDocument.findOne({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    const exp = calculateDocumentExpiry(doc.expiryDate);
    return res.json({
      success: true,
      document: {
        ...doc.toObject(),
        expiryStatus: exp.status,
        daysRemaining: exp.daysRemaining,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function renewDocument(req, res, next) {
  try {
    const { id } = req.params;
    const data = documentRenewalSchema.parse(req.body);

    const doc = await VehicleDocument.findOne({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Save previous expiry to renewal history
    doc.renewalHistory.push({
      previousExpiryDate: doc.expiryDate,
      newExpiryDate: data.newExpiryDate,
      renewedAt: new Date(),
      premium: data.premium || null,
      notes: data.notes || '',
    });

    doc.expiryDate = data.newExpiryDate;
    if (data.premium) doc.premium = data.premium;
    await doc.save();

    const exp = calculateDocumentExpiry(doc.expiryDate);

    return res.json({
      success: true,
      message: 'Document renewal recorded.',
      document: {
        ...doc.toObject(),
        expiryStatus: exp.status,
        daysRemaining: exp.daysRemaining,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await VehicleDocument.findOneAndDelete({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    return res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    next(error);
  }
}
