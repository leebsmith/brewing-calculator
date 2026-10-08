from contextlib import asynccontextmanager
from typing import Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db, init_firebase
from app.service import logic
from app.auth import get_current_user
from app.schemas.models import (
    PingResponse,
    AuthenticatedUser,
    FermentablesCatalogResponse,
    YeastCatalogResponse,
    BatchSolverRequest,
    BatchSolverResponse,
    StageCascadeModel,
)
from app.schemas.templates import EquipmentProfile, EquipmentProfilesResponse
from app.core.batch_solver import (
    BatchSolverInput,
    GrainBillEntry,
    SolverValidationError,
    solve_batch,
)

ERR_CANNOT_DELETE_PRESET = "Cannot delete built-in canonical equipment preset."

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    yield

app = FastAPI(title="Batch Brewing Calculator", lifespan=lifespan)


# CORS configuration for development and production
# In production, Firebase Hosting acts as a proxy, so requests appear to originate from the same origin.
# However, explicitly configuring CORS is a good security practice.
# For local development, we allow Vite's default dev server port and the Firebase emulator port.
# For production, we allow the Firebase Hosting domain(s).

# NOTE: Replace '<your-firebase-project-id>' with your actual Firebase project ID.
# The production Firebase domain is typically '<your-firebase-project-id>.web.app' or '<your-firebase-project-id>.firebaseapp.com'.
# If using custom domains, those should also be added here.
PRODUCTION_FIREBASE_DOMAINS = [
    "https://batch-brewing-calculator.web.app",
    "https://batch-brewing-calculator.firebaseapp.com",
    # Add any custom domains here if applicable
    # "https://your-custom-domain.com"
]

# Combine development and production origins. Using a set to avoid duplicates.
ALL_ALLOWED_ORIGINS = list(set([
    "http://localhost:5173",  # Vite default dev server port
    "http://127.0.0.1:5173",  # Vite default dev server port (alternative)
    "http://localhost:5000",  # Firebase emulator port (for Hosting)
    "http://127.0.0.1:5000",  # Firebase emulator port (for Hosting)
    "http://localhost:8000",  # FastAPI backend dev server port
    "http://127.0.0.1:8000",  # FastAPI backend dev server port (alternative)
    *PRODUCTION_FIREBASE_DOMAINS
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALL_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], # Allowing OPTIONS for preflight requests
    allow_headers=["*"],
)

@app.get("/api/ping", response_model=PingResponse)
@app.get("/ping", response_model=PingResponse)
def ping_endpoint(
    message: str = "Hello Cloud Run",
    db: Any = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route.
    FastAPI resolves `get_db` and `get_current_user`, passing the verified user's uid
    and database client to the service layer.
    """
    return logic.process_ping(db, message, user_id=current_user.uid)


@app.get("/api/fermentables", response_model=FermentablesCatalogResponse)
def get_fermentables_endpoint(
    db: Any = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route for fermentables catalog (malts and sugars).
    Requires valid Firebase ID token authentication.
    """
    return logic.get_fermentables_catalog(db)


@app.get("/api/yeasts", response_model=YeastCatalogResponse)
def get_yeasts_endpoint(
    db: Any = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route for the yeast catalog.
    Requires valid Firebase ID token authentication.
    """
    return logic.get_yeast_catalog(db)


@app.get("/api/equipment-profiles", response_model=EquipmentProfilesResponse)
def get_equipment_profiles_endpoint(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route for equipment profiles.
    Returns canonical seeds alongside user-saved custom profiles.
    """
    return logic.get_equipment_profiles()


@app.post("/api/equipment-profiles", response_model=EquipmentProfile, status_code=status.HTTP_201_CREATED)
def save_equipment_profile_endpoint(
    profile: EquipmentProfile,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route to save or update a custom equipment profile.
    """
    return logic.save_equipment_profile(profile)


@app.delete("/api/equipment-profiles/{profile_id}")
def delete_equipment_profile_endpoint(
    profile_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route to delete a custom equipment profile.
    Cannot delete canonical seed profiles.
    """
    success = logic.delete_equipment_profile(profile_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERR_CANNOT_DELETE_PRESET,
        )
    return {"success": True, "deleted_id": profile_id}


@app.post("/api/solve-batch", response_model=BatchSolverResponse)
def solve_batch_endpoint(
    request: BatchSolverRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route for the batch-sparging solver.
    Composes Phases 1-4 and returns the derived anchors and stage cascade.
    """
    inputs = BatchSolverInput(
        target_abv=request.target_abv,
        apparent_attenuation=request.apparent_attenuation,
        v_ferm=request.v_ferm,
        topology=request.topology,
        intensive_value=request.intensive_value,
        grain_bill=[
            GrainBillEntry(w_i=e.w_i, dbfg_i=e.dbfg_i, mc_i=e.mc_i)
            for e in request.grain_bill
        ],
        s_late_add=request.s_late_add,
        v_kettle_dead=request.v_kettle_dead,
        delta_v_evap=request.delta_v_evap,
        v_dead=request.v_dead,
        eta_conv=request.eta_conv,
        f_shrink=request.f_shrink,
    )

    try:
        result = solve_batch(inputs)
    except SolverValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message},
        )

    return BatchSolverResponse(
        sg_post_boil=result.sg_post_boil,
        v_pre_boil=result.v_pre_boil,
        s_post_boil_target=result.s_post_boil_target,
        m_grist=result.m_grist,
        cascade=StageCascadeModel(
            v_strike=result.cascade.v_strike,
            v_run1=result.cascade.v_run1,
            v_run2=result.cascade.v_run2,
            v_sparge=result.cascade.v_sparge,
            s_run1=result.cascade.s_run1,
            s_run2=result.cascade.s_run2,
            sg_pre_boil=result.cascade.sg_pre_boil,
            v_post_boil=result.cascade.v_post_boil,
        ),
    )


